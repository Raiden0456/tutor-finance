import { BadRequestException, Inject, Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { and, eq, inArray, isNull, lt, sql } from 'drizzle-orm';
import { RedisCacheService } from '../cache/redis-cache.service.js';
import { env } from '../config.js';
import type { Database } from '../db/client.js';
import { DB } from '../db/db.module.js';
import {
  devicePushTokens,
  lessons,
  notificationDeliveries,
  students,
  userSettings,
} from '../db/schema.js';
import type { RegisterDeviceTokenDto, RegisterDeviceTokenResponse } from './notifications.dto.js';

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';
const EXPO_PUSH_TIMEOUT_MS = 10_000;
const EXPO_PUSH_CHUNK_SIZE = 100;
const EXPO_PUSH_CHANNEL_ID = 'reminders';
const DEFAULT_REMINDER_MINUTES = 30;
const LESSON_REMINDER_WINDOW_BEFORE_MS = 30 * 1000;
const LESSON_REMINDER_WINDOW_AFTER_MS = 90 * 1000;
const DUE_STATUSES = ['due', 'partially_paid'] as const;

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

    const reminderAt = sql`${lessons.startsAt} - (coalesce(${userSettings.lessonReminderMinutes}, ${DEFAULT_REMINDER_MINUTES}) * interval '1 minute')`;
    const windowFrom = sql`(now() at time zone 'utc') - make_interval(secs => ${LESSON_REMINDER_WINDOW_BEFORE_MS / 1000})`;
    const windowTo = sql`(now() at time zone 'utc') + make_interval(secs => ${LESSON_REMINDER_WINDOW_AFTER_MS / 1000})`;

    const upcoming = await this.db
      .select({
        id: lessons.id,
        userId: lessons.userId,
        startsAt: lessons.startsAt,
        studentName: students.name,
        reminderMinutes: sql<number>`coalesce(${userSettings.lessonReminderMinutes}, ${DEFAULT_REMINDER_MINUTES})`,
        locale: sql<string>`coalesce(${userSettings.locale}, 'en')`,
      })
      .from(lessons)
      .leftJoin(
        students,
        and(eq(students.id, lessons.studentId), eq(students.userId, lessons.userId)),
      )
      .leftJoin(userSettings, eq(userSettings.userId, lessons.userId))
      .where(
        and(
          eq(lessons.status, 'scheduled'),
          isNull(lessons.archivedAt),
          sql`${reminderAt} >= ${windowFrom}`,
          sql`${reminderAt} < ${windowTo}`,
        ),
      );

    for (const lesson of upcoming) {
      const studentName = lesson.studentName ?? 'Lesson';
      const minutes = Number(lesson.reminderMinutes) || DEFAULT_REMINDER_MINUTES;
      await this.queueAndSend({
        userId: lesson.userId,
        type: NOTIFICATION_TYPES.lessonReminder,
        entityId: lesson.id,
        scheduledFor: lesson.startsAt,
        title: lessonReminderTitle(lesson.locale, minutes),
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
        studentCount: sql<number>`cast(count(distinct ${lessons.studentId}) as integer)`,
        locale: sql<string>`coalesce(min(${userSettings.locale}), 'en')`,
      })
      .from(lessons)
      .leftJoin(userSettings, eq(userSettings.userId, lessons.userId))
      .where(and(inArray(lessons.status, [...DUE_STATUSES]), isNull(lessons.archivedAt)))
      .groupBy(lessons.userId);

    for (const row of rows) {
      const dueCount = Number(row.dueCount);
      if (dueCount <= 0) continue;

      await this.queueAndSend({
        userId: row.userId,
        type: NOTIFICATION_TYPES.dailyDueSummary,
        entityId: row.userId,
        scheduledFor,
        title: row.locale === 'ru' ? 'Ожидается оплата' : 'Payments due',
        body: dailyDueBody(row.locale, dueCount, Number(row.studentCount)),
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

function lessonReminderTitle(locale: string, minutes: number): string {
  if (locale === 'ru') {
    if (minutes % 60 === 0) {
      const hours = minutes / 60;
      return `Урок через ${hours} ${hours === 1 ? 'час' : hours < 5 ? 'часа' : 'часов'}`;
    }
    return `Урок через ${minutes} мин`;
  }
  if (minutes % 60 === 0) {
    const hours = minutes / 60;
    return `Lesson in ${hours} ${hours === 1 ? 'hour' : 'hours'}`;
  }
  return `Lesson in ${minutes} min`;
}

function dailyDueBody(locale: string, dueCount: number, studentCount: number): string {
  if (locale === 'ru') {
    return `Неоплаченных уроков: ${dueCount} · учеников: ${studentCount}`;
  }
  return `Unpaid lessons: ${dueCount} · students: ${studentCount}`;
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
