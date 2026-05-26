import { BadRequestException, Inject, Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { and, eq, gte, isNull, lt, sql } from 'drizzle-orm';
import { RedisCacheService } from '../cache/redis-cache.service.js';
import { env } from '../config.js';
import type { Database } from '../db/client.js';
import { DB } from '../db/db.module.js';
import { devicePushTokens, lessons, notificationDeliveries, students } from '../db/schema.js';
import type { RegisterDeviceTokenDto, RegisterDeviceTokenResponse } from './notifications.dto.js';

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';
const EXPO_PUSH_TIMEOUT_MS = 10_000;
const EXPO_PUSH_CHUNK_SIZE = 100;
const EXPO_PUSH_CHANNEL_ID = 'reminders';
const LESSON_REMINDER_MS = 10 * 60 * 1000;
const LESSON_REMINDER_WINDOW_BEFORE_MS = 30 * 1000;
const LESSON_REMINDER_WINDOW_AFTER_MS = 90 * 1000;

const NOTIFICATION_TYPES = {
  lessonReminder: 'lesson_reminder',
  dailyDueSummary: 'daily_due_summary',
} as const;

type NotificationType = (typeof NOTIFICATION_TYPES)[keyof typeof NOTIFICATION_TYPES];
type DeliveryStatus = 'sent' | 'failed';

type ExpoPushTicket = {
  status?: 'ok' | 'error';
  id?: string;
  message?: string;
  details?: { error?: string };
};

type ExpoPushResponse = {
  data?: ExpoPushTicket[];
  errors?: unknown;
};

interface QueuePushArgs {
  userId: string;
  type: NotificationType;
  entityId: string;
  scheduledFor: Date;
  title: string;
  body: string;
  path: string;
}

interface ExpoMessage {
  to: string;
  sound: 'default';
  title: string;
  body: string;
  data: Record<string, string>;
  channelId: string;
}

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    @Inject(DB) private readonly db: Database,
    private readonly cacheService: RedisCacheService,
  ) {}

  async registerDeviceToken(
    userId: string,
    input: RegisterDeviceTokenDto,
  ): Promise<RegisterDeviceTokenResponse> {
    if (!isExpoPushToken(input.token)) {
      throw new BadRequestException('Invalid Expo push token');
    }

    const now = new Date();
    await this.db
      .insert(devicePushTokens)
      .values({
        userId,
        token: input.token,
        platform: input.platform ?? null,
        lastSeenAt: now,
        disabledAt: null,
      })
      .onConflictDoUpdate({
        target: devicePushTokens.token,
        set: {
          userId,
          platform: input.platform ?? null,
          lastSeenAt: now,
          disabledAt: null,
          updatedAt: now,
        },
      });

    return { ok: true };
  }

  @Cron('* * * * *')
  async dispatchLessonReminders(): Promise<void> {
    if (!env.push.enabled) return;

    const now = new Date();
    const from = new Date(now.getTime() + LESSON_REMINDER_MS - LESSON_REMINDER_WINDOW_BEFORE_MS);
    const to = new Date(now.getTime() + LESSON_REMINDER_MS + LESSON_REMINDER_WINDOW_AFTER_MS);

    const upcoming = await this.db
      .select({
        id: lessons.id,
        userId: lessons.userId,
        startsAt: lessons.startsAt,
        studentName: students.name,
      })
      .from(lessons)
      .leftJoin(
        students,
        and(eq(students.id, lessons.studentId), eq(students.userId, lessons.userId)),
      )
      .where(
        and(
          eq(lessons.status, 'scheduled'),
          isNull(lessons.archivedAt),
          gte(lessons.startsAt, from),
          lt(lessons.startsAt, to),
        ),
      );

    for (const lesson of upcoming) {
      const studentName = lesson.studentName ?? 'Lesson';
      await this.queueAndSend({
        userId: lesson.userId,
        type: NOTIFICATION_TYPES.lessonReminder,
        entityId: lesson.id,
        scheduledFor: lesson.startsAt,
        title: 'Lesson in 10 minutes',
        body: `${studentName} · ${formatTime(lesson.startsAt)}`,
        path: `/lessons/${lesson.id}`,
      });
    }
  }

  @Cron('0 9 * * *')
  async dispatchDailyDueSummary(): Promise<void> {
    if (!env.push.enabled) return;

    await this.markStaleLessonsDue();

    const scheduledFor = new Date();
    scheduledFor.setUTCHours(0, 0, 0, 0);

    const rows = await this.db
      .select({
        userId: lessons.userId,
        dueCount: sql<number>`cast(count(${lessons.id}) as integer)`,
      })
      .from(lessons)
      .where(and(eq(lessons.status, 'due'), isNull(lessons.archivedAt)))
      .groupBy(lessons.userId);

    for (const row of rows) {
      const dueCount = Number(row.dueCount);
      if (dueCount <= 0) continue;

      await this.queueAndSend({
        userId: row.userId,
        type: NOTIFICATION_TYPES.dailyDueSummary,
        entityId: row.userId,
        scheduledFor,
        title: 'Payments due',
        body: `You have ${dueCount} unpaid ${dueCount === 1 ? 'lesson' : 'lessons'}`,
        path: '/transactions',
      });
    }
  }

  private async queueAndSend(args: QueuePushArgs): Promise<void> {
    const tokens = await this.getActiveTokens(args.userId);
    if (tokens.length === 0) return;

    const [delivery] = await this.db
      .insert(notificationDeliveries)
      .values({
        userId: args.userId,
        type: args.type,
        entityId: args.entityId,
        scheduledFor: args.scheduledFor,
        status: 'pending',
      })
      .onConflictDoNothing({
        target: [
          notificationDeliveries.type,
          notificationDeliveries.entityId,
          notificationDeliveries.scheduledFor,
        ],
      })
      .returning({ id: notificationDeliveries.id });

    if (!delivery) return;

    try {
      const sentCount = await this.sendExpoPush(tokens, {
        type: args.type,
        path: args.path,
        title: args.title,
        body: args.body,
      });
      if (sentCount > 0) {
        await this.markDelivery(delivery.id, 'sent');
      } else {
        await this.markDelivery(delivery.id, 'failed', 'Expo accepted no push tickets');
      }
    } catch (err) {
      const message = errorMessage(err);
      this.logger.warn(`Push delivery failed: ${message}`);
      await this.markDelivery(delivery.id, 'failed', message);
    }
  }

  private async sendExpoPush(
    tokens: string[],
    content: { type: NotificationType; path: string; title: string; body: string },
  ): Promise<number> {
    let sentCount = 0;

    for (const chunk of chunks(tokens, EXPO_PUSH_CHUNK_SIZE)) {
      const messages: ExpoMessage[] = chunk.map((token) => ({
        to: token,
        sound: 'default',
        title: content.title,
        body: content.body,
        data: { type: content.type, path: content.path },
        channelId: EXPO_PUSH_CHANNEL_ID,
      }));

      const res = await fetch(EXPO_PUSH_URL, {
        method: 'POST',
        headers: {
          accept: 'application/json',
          'content-type': 'application/json',
        },
        body: JSON.stringify(messages),
        signal: AbortSignal.timeout(EXPO_PUSH_TIMEOUT_MS),
      });
      const text = await res.text();
      const payload = safeJson(text) as ExpoPushResponse;

      if (!res.ok) {
        throw new Error(`Expo Push API ${res.status}: ${text || res.statusText}`);
      }

      const tickets = Array.isArray(payload.data) ? payload.data : [];
      for (let i = 0; i < tickets.length; i++) {
        const ticket = tickets[i];
        const token = chunk[i];
        if (ticket?.status === 'ok') {
          sentCount++;
          continue;
        }

        const reason = ticket?.details?.error ?? ticket?.message ?? 'Unknown Expo push error';
        if (reason === 'DeviceNotRegistered' && token) {
          await this.disableToken(token);
        }
        this.logger.warn(`Expo rejected push token: ${reason}`);
      }
    }

    return sentCount;
  }

  private async getActiveTokens(userId: string): Promise<string[]> {
    const rows = await this.db
      .select({ token: devicePushTokens.token })
      .from(devicePushTokens)
      .where(and(eq(devicePushTokens.userId, userId), isNull(devicePushTokens.disabledAt)));
    return rows.map((row) => row.token);
  }

  private async disableToken(token: string): Promise<void> {
    await this.db
      .update(devicePushTokens)
      .set({ disabledAt: new Date(), updatedAt: new Date() })
      .where(eq(devicePushTokens.token, token));
  }

  private async markDelivery(id: string, status: DeliveryStatus, error?: string): Promise<void> {
    await this.db
      .update(notificationDeliveries)
      .set({
        status,
        sentAt: status === 'sent' ? new Date() : null,
        error: error ? error.slice(0, 1000) : null,
        updatedAt: new Date(),
      })
      .where(eq(notificationDeliveries.id, id));
  }

  private async markStaleLessonsDue(): Promise<void> {
    const rows = await this.db
      .update(lessons)
      .set({ status: 'due' })
      .where(
        and(
          eq(lessons.status, 'scheduled'),
          isNull(lessons.archivedAt),
          lt(sql`${lessons.startsAt} + (${lessons.durationMin} * interval '1 minute')`, sql`now()`),
        ),
      )
      .returning({ userId: lessons.userId });

    const userIds = [...new Set(rows.map((row) => row.userId))];
    await Promise.all(userIds.map((userId) => this.invalidateUserCache(userId)));
  }

  private async invalidateUserCache(userId: string): Promise<void> {
    await Promise.all([
      this.cacheService.deleteByPrefix(`user:${userId}:dashboard:`),
      this.cacheService.deleteByPrefix(`user:${userId}:lessons:`),
      this.cacheService.deleteByPrefix(`user:${userId}:transactions:`),
    ]);
  }
}

function isExpoPushToken(token: string): boolean {
  return /^Expo(nent)?PushToken\[[^\]]+\]$/.test(token);
}

function formatTime(date: Date): string {
  return new Intl.DateTimeFormat('en', { hour: '2-digit', minute: '2-digit' }).format(date);
}

function chunks<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

function safeJson(text: string): unknown {
  try {
    return text ? JSON.parse(text) : undefined;
  } catch {
    return undefined;
  }
}

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}
