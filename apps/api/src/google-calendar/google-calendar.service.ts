import { ForbiddenException, Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { and, asc, eq, gte, isNull, lte, sql } from 'drizzle-orm';
import { auth } from '../auth/auth.provider.js';
import { RedisCacheService } from '../cache/redis-cache.service.js';
import { env } from '../config.js';
import type { Database } from '../db/client.js';
import { DB } from '../db/db.module.js';
import { account, calendarSyncJobs, lessons, students, userSettings } from '../db/schema.js';
import type {
  CalendarConnectResponse,
  CalendarConnectionStatus,
  CalendarDisconnectResponse,
  CalendarSyncResponse,
} from './google-calendar.dto.js';

export const CALENDAR_SCOPE = 'https://www.googleapis.com/auth/calendar.app.created';
const GOOGLE_API_BASE = 'https://www.googleapis.com/calendar/v3';
const REQUEST_TIMEOUT_MS = 10_000;
const MAX_ATTEMPTS = 8;
const MAX_BACKOFF_MS = 60 * 60 * 1000;
const DISPATCH_BATCH = 50;
const BACKFILL_HORIZON_DAYS = 365;

export const CALENDAR_ERROR_CODES = {
  NO_GOOGLE_ACCOUNT: 'NO_GOOGLE_ACCOUNT',
  NO_CALENDAR_SCOPE: 'NO_CALENDAR_SCOPE',
  NOT_CONNECTED: 'NOT_CONNECTED',
} as const;

type AccountRow = typeof account.$inferSelect;
type LessonRow = typeof lessons.$inferSelect;
type JobRow = typeof calendarSyncJobs.$inferSelect;

interface SyncContext {
  accessToken: string;
  calendarId: string;
}

interface GoogleEventBody {
  summary: string;
  description: string;
  start: { dateTime: string; timeZone: string };
  end: { dateTime: string; timeZone: string };
  source: { title: string; url: string };
}

@Injectable()
export class GoogleCalendarService {
  private readonly logger = new Logger(GoogleCalendarService.name);

  constructor(
    @Inject(DB) private readonly db: Database,
    private readonly cache: RedisCacheService,
  ) {}

  async getStatus(userId: string): Promise<CalendarConnectionStatus> {
    const googleAccount = await this.findGoogleAccount(userId);
    const hasCalendarScope = scopeIncludesCalendar(googleAccount?.scope ?? null);
    const settings = await this.findSettings(userId);
    const pendingJobs = await this.countPendingJobs(userId);

    return {
      hasGoogleAccount: !!googleAccount,
      hasCalendarScope,
      calendarEnabled: settings?.googleCalendarSyncEnabled ?? false,
      calendarUrl: settings?.googleCalendarId
        ? `https://calendar.google.com/calendar/u/0/r?cid=${encodeURIComponent(settings.googleCalendarId)}`
        : null,
      lastSyncedAt: settings?.googleCalendarLastSyncedAt?.toISOString() ?? null,
      pendingJobs,
    };
  }

  async connect(userId: string): Promise<CalendarConnectResponse> {
    const googleAccount = await this.findGoogleAccount(userId);
    if (!googleAccount) {
      throw new ForbiddenException({
        code: CALENDAR_ERROR_CODES.NO_GOOGLE_ACCOUNT,
        message: 'Connect a Google account first',
      });
    }
    if (!scopeIncludesCalendar(googleAccount.scope)) {
      throw new ForbiddenException({
        code: CALENDAR_ERROR_CODES.NO_CALENDAR_SCOPE,
        message: 'Grant Google Calendar access first',
      });
    }

    const accessToken = await this.fetchAccessToken(userId, googleAccount.id);
    const calendarId = await this.ensureCalendar(userId, accessToken);

    await this.db
      .insert(userSettings)
      .values({
        userId,
        googleCalendarSyncEnabled: true,
        googleCalendarId: calendarId,
        googleCalendarConnectedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: userSettings.userId,
        set: {
          googleCalendarSyncEnabled: true,
          googleCalendarId: calendarId,
          googleCalendarConnectedAt: new Date(),
        },
      });

    await this.cache.del(`user:${userId}:settings:me`);
    void this.backfillFuture(userId).catch((err) =>
      this.logger.warn(`Backfill failed for user ${userId}: ${errorMessage(err)}`),
    );

    return {
      ok: true,
      calendarUrl: `https://calendar.google.com/calendar/u/0/r?cid=${encodeURIComponent(calendarId)}`,
    };
  }

  async syncNow(userId: string): Promise<CalendarSyncResponse> {
    const settings = await this.findSettings(userId);
    if (!settings?.googleCalendarSyncEnabled || !settings.googleCalendarId) {
      throw new ForbiddenException({
        code: CALENDAR_ERROR_CODES.NOT_CONNECTED,
        message: 'Google Calendar is not connected',
      });
    }

    const queued = await this.backfillFuture(userId);
    await this.dispatch();
    await this.db
      .update(userSettings)
      .set({ googleCalendarLastSyncedAt: new Date() })
      .where(eq(userSettings.userId, userId));

    return { ok: true, queued };
  }

  async disconnect(
    userId: string,
    opts: { deleteRemoteCalendar?: boolean } = {},
  ): Promise<CalendarDisconnectResponse> {
    const settings = await this.findSettings(userId);
    if (!settings?.googleCalendarSyncEnabled) {
      return { ok: true };
    }

    if (opts.deleteRemoteCalendar && settings.googleCalendarId) {
      try {
        const googleAccount = await this.findGoogleAccount(userId);
        if (googleAccount && scopeIncludesCalendar(googleAccount.scope)) {
          const accessToken = await this.fetchAccessToken(userId, googleAccount.id);
          await this.deleteCalendar(accessToken, settings.googleCalendarId);
        }
      } catch (err) {
        this.logger.warn(`Failed to delete remote calendar: ${errorMessage(err)}`);
      }
    }

    await this.db
      .update(userSettings)
      .set({
        googleCalendarSyncEnabled: false,
        googleCalendarId: null,
        googleCalendarConnectedAt: null,
        googleCalendarLastSyncedAt: null,
      })
      .where(eq(userSettings.userId, userId));

    await this.db.update(lessons).set({ googleEventId: null }).where(eq(lessons.userId, userId));

    await this.db.delete(calendarSyncJobs).where(eq(calendarSyncJobs.userId, userId));

    await this.cache.del(`user:${userId}:settings:me`);
    return { ok: true };
  }

  async enqueueUpsert(userId: string, lessonId: string): Promise<void> {
    const settings = await this.findSettings(userId);
    if (!settings?.googleCalendarSyncEnabled || !settings.googleCalendarId) return;

    await this.db.insert(calendarSyncJobs).values({
      userId,
      lessonId,
      operation: 'upsert',
    });
    void this.dispatchSoon();
  }

  async enqueueDelete(userId: string, googleEventId: string | null): Promise<void> {
    if (!googleEventId) return;
    const settings = await this.findSettings(userId);
    if (!settings?.googleCalendarSyncEnabled || !settings.googleCalendarId) return;

    await this.db.insert(calendarSyncJobs).values({
      userId,
      googleEventId,
      operation: 'delete',
    });
    void this.dispatchSoon();
  }

  @Cron('*/5 * * * *')
  async dispatch(): Promise<void> {
    const now = new Date();
    const due = await this.db
      .select()
      .from(calendarSyncJobs)
      .where(
        and(
          lte(calendarSyncJobs.nextAttemptAt, now),
          lte(calendarSyncJobs.attempts, MAX_ATTEMPTS - 1),
        ),
      )
      .orderBy(asc(calendarSyncJobs.nextAttemptAt))
      .limit(DISPATCH_BATCH);

    if (due.length === 0) return;

    const byUser = new Map<string, JobRow[]>();
    for (const job of due) {
      const list = byUser.get(job.userId) ?? [];
      list.push(job);
      byUser.set(job.userId, list);
    }

    for (const [userId, jobs] of byUser) {
      let ctx: SyncContext | null;
      try {
        ctx = await this.buildSyncContext(userId);
      } catch (err) {
        const message = errorMessage(err);
        for (const job of jobs) await this.recordFailure(job, message);
        continue;
      }
      if (!ctx) {
        for (const job of jobs) await this.recordFailure(job, 'Sync disabled');
        continue;
      }

      for (const job of jobs) {
        try {
          await this.executeJob(ctx, job);
          await this.db.delete(calendarSyncJobs).where(eq(calendarSyncJobs.id, job.id));
        } catch (err) {
          await this.recordFailure(job, errorMessage(err));
        }
      }

      await this.db
        .update(userSettings)
        .set({ googleCalendarLastSyncedAt: new Date() })
        .where(eq(userSettings.userId, userId));
    }
  }

  async backfillFuture(userId: string): Promise<number> {
    const horizon = new Date();
    horizon.setUTCDate(horizon.getUTCDate() + BACKFILL_HORIZON_DAYS);
    const rows = await this.db
      .select({ id: lessons.id })
      .from(lessons)
      .where(
        and(
          eq(lessons.userId, userId),
          isNull(lessons.archivedAt),
          gte(lessons.startsAt, new Date()),
          lte(lessons.startsAt, horizon),
        ),
      );
    if (rows.length === 0) return 0;
    await this.db.insert(calendarSyncJobs).values(
      rows.map((r) => ({
        userId,
        lessonId: r.id,
        operation: 'upsert' as const,
      })),
    );
    void this.dispatchSoon();
    return rows.length;
  }

  private async buildSyncContext(userId: string): Promise<SyncContext | null> {
    const settings = await this.findSettings(userId);
    if (!settings?.googleCalendarSyncEnabled || !settings.googleCalendarId) return null;

    const googleAccount = await this.findGoogleAccount(userId);
    if (!googleAccount) {
      throw new Error(CALENDAR_ERROR_CODES.NO_GOOGLE_ACCOUNT);
    }
    if (!scopeIncludesCalendar(googleAccount.scope)) {
      throw new Error(CALENDAR_ERROR_CODES.NO_CALENDAR_SCOPE);
    }

    const accessToken = await this.fetchAccessToken(userId, googleAccount.id);
    return { accessToken, calendarId: settings.googleCalendarId };
  }

  private async executeJob(ctx: SyncContext, job: JobRow): Promise<void> {
    if (job.operation === 'delete') {
      if (job.googleEventId) {
        await this.deleteEvent(ctx, job.googleEventId);
      }
      return;
    }

    if (!job.lessonId) return;
    const lesson = await this.findLessonForSync(job.userId, job.lessonId);
    if (!lesson) return;

    const body = this.buildEventBody(lesson.lesson, lesson.studentName);
    if (lesson.lesson.googleEventId) {
      const updated = await this.patchEvent(ctx, lesson.lesson.googleEventId, body);
      if (!updated) {
        const created = await this.insertEvent(ctx, body);
        await this.db
          .update(lessons)
          .set({ googleEventId: created.id })
          .where(eq(lessons.id, lesson.lesson.id));
      }
    } else {
      const created = await this.insertEvent(ctx, body);
      await this.db
        .update(lessons)
        .set({ googleEventId: created.id })
        .where(eq(lessons.id, lesson.lesson.id));
    }
  }

  private async findLessonForSync(
    userId: string,
    lessonId: string,
  ): Promise<{ lesson: LessonRow; studentName: string } | null> {
    const [row] = await this.db
      .select({
        lesson: lessons,
        studentName: students.name,
      })
      .from(lessons)
      .leftJoin(students, and(eq(students.id, lessons.studentId), eq(students.userId, userId)))
      .where(and(eq(lessons.id, lessonId), eq(lessons.userId, userId), isNull(lessons.archivedAt)))
      .limit(1);
    if (!row) return null;
    return { lesson: row.lesson, studentName: row.studentName ?? 'Lesson' };
  }

  private buildEventBody(lesson: LessonRow, studentName: string): GoogleEventBody {
    const start = lesson.startsAt;
    const end = new Date(start.getTime() + lesson.durationMin * 60_000);
    const titleSuffix =
      lesson.status === 'cancelled'
        ? ' (cancelled)'
        : lesson.status === 'no_show'
          ? ' (no show)'
          : '';
    const descParts: string[] = [];
    if (lesson.notes) descParts.push(lesson.notes);
    if (lesson.meetingLink) descParts.push(lesson.meetingLink);
    descParts.push(`${env.publicAppUrl}/lessons/${lesson.id}`);

    return {
      summary: `${studentName}${titleSuffix}`,
      description: descParts.join('\n\n'),
      start: { dateTime: start.toISOString(), timeZone: 'UTC' },
      end: { dateTime: end.toISOString(), timeZone: 'UTC' },
      source: {
        title: 'Uchetka',
        url: `${env.publicAppUrl}/lessons/${lesson.id}`,
      },
    };
  }

  private async recordFailure(job: JobRow, message: string): Promise<void> {
    const nextAttempts = job.attempts + 1;
    if (nextAttempts >= MAX_ATTEMPTS) {
      await this.db
        .update(calendarSyncJobs)
        .set({ attempts: nextAttempts, lastError: message.slice(0, 1000) })
        .where(eq(calendarSyncJobs.id, job.id));
      this.logger.warn(`Calendar sync job ${job.id} exhausted retries: ${message}`);
      return;
    }
    const backoffMs = Math.min(2 ** nextAttempts * 60 * 1000, MAX_BACKOFF_MS);
    await this.db
      .update(calendarSyncJobs)
      .set({
        attempts: nextAttempts,
        lastError: message.slice(0, 1000),
        nextAttemptAt: new Date(Date.now() + backoffMs),
      })
      .where(eq(calendarSyncJobs.id, job.id));
  }

  private async ensureCalendar(userId: string, accessToken: string): Promise<string> {
    const settings = await this.findSettings(userId);
    if (settings?.googleCalendarId) {
      const stillExists = await this.calendarExists(accessToken, settings.googleCalendarId);
      if (stillExists) return settings.googleCalendarId;
    }

    const created = await this.createCalendar(accessToken);
    return created.id;
  }

  private async calendarExists(accessToken: string, calendarId: string): Promise<boolean> {
    const res = await this.callGoogle(
      'GET',
      `/calendars/${encodeURIComponent(calendarId)}`,
      accessToken,
    );
    if (res.status === 404 || res.status === 410) return false;
    if (!res.ok) {
      throw new Error(`Calendar lookup failed (${res.status}): ${await res.text()}`);
    }
    return true;
  }

  private async createCalendar(accessToken: string): Promise<{ id: string }> {
    const res = await this.callGoogle('POST', '/calendars', accessToken, {
      summary: 'Uchetka',
      description: 'Lessons synced from Uchetka',
      timeZone: 'UTC',
    });
    if (!res.ok) {
      throw new Error(`Calendar create failed (${res.status}): ${await res.text()}`);
    }
    const json = (await res.json()) as { id: string };
    return { id: json.id };
  }

  private async insertEvent(ctx: SyncContext, body: GoogleEventBody): Promise<{ id: string }> {
    const res = await this.callGoogle(
      'POST',
      `/calendars/${encodeURIComponent(ctx.calendarId)}/events`,
      ctx.accessToken,
      body,
    );
    if (!res.ok) {
      throw new Error(`Event insert failed (${res.status}): ${await res.text()}`);
    }
    const json = (await res.json()) as { id: string };
    return { id: json.id };
  }

  private async patchEvent(
    ctx: SyncContext,
    eventId: string,
    body: GoogleEventBody,
  ): Promise<boolean> {
    const res = await this.callGoogle(
      'PATCH',
      `/calendars/${encodeURIComponent(ctx.calendarId)}/events/${encodeURIComponent(eventId)}`,
      ctx.accessToken,
      body,
    );
    if (res.status === 404 || res.status === 410) return false;
    if (!res.ok) {
      throw new Error(`Event patch failed (${res.status}): ${await res.text()}`);
    }
    return true;
  }

  private async deleteEvent(ctx: SyncContext, eventId: string): Promise<void> {
    const res = await this.callGoogle(
      'DELETE',
      `/calendars/${encodeURIComponent(ctx.calendarId)}/events/${encodeURIComponent(eventId)}`,
      ctx.accessToken,
    );
    if (res.status === 404 || res.status === 410 || res.status === 204 || res.ok) return;
    throw new Error(`Event delete failed (${res.status}): ${await res.text()}`);
  }

  private async deleteCalendar(accessToken: string, calendarId: string): Promise<void> {
    const res = await this.callGoogle(
      'DELETE',
      `/calendars/${encodeURIComponent(calendarId)}`,
      accessToken,
    );
    if (res.status === 404 || res.status === 410 || res.status === 204 || res.ok) return;
    throw new Error(`Calendar delete failed (${res.status}): ${await res.text()}`);
  }

  private async callGoogle(
    method: 'GET' | 'POST' | 'PATCH' | 'DELETE',
    path: string,
    accessToken: string,
    body?: unknown,
  ): Promise<Response> {
    return fetch(`${GOOGLE_API_BASE}${path}`, {
      method,
      headers: {
        authorization: `Bearer ${accessToken}`,
        'content-type': 'application/json',
        accept: 'application/json',
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  }

  private async findGoogleAccount(userId: string): Promise<AccountRow | null> {
    const [row] = await this.db
      .select()
      .from(account)
      .where(and(eq(account.userId, userId), eq(account.providerId, 'google')))
      .limit(1);
    return row ?? null;
  }

  private async findSettings(userId: string): Promise<typeof userSettings.$inferSelect | null> {
    const [row] = await this.db
      .select()
      .from(userSettings)
      .where(eq(userSettings.userId, userId))
      .limit(1);
    return row ?? null;
  }

  private async countPendingJobs(userId: string): Promise<number> {
    const [row] = await this.db
      .select({ c: sql<number>`cast(count(*) as integer)` })
      .from(calendarSyncJobs)
      .where(eq(calendarSyncJobs.userId, userId));
    return Number(row?.c ?? 0);
  }

  private async fetchAccessToken(userId: string, _accountId: string): Promise<string> {
    const result = await auth.api.getAccessToken({
      body: { providerId: 'google', userId },
    });
    if (!result?.accessToken) {
      throw new NotFoundException('Failed to obtain Google access token');
    }
    return result.accessToken;
  }

  private dispatchTimer: NodeJS.Timeout | null = null;
  private async dispatchSoon(): Promise<void> {
    if (this.dispatchTimer) return;
    this.dispatchTimer = setTimeout(() => {
      this.dispatchTimer = null;
      void this.dispatch().catch((err) =>
        this.logger.warn(`dispatchSoon failed: ${errorMessage(err)}`),
      );
    }, 250);
  }
}

function scopeIncludesCalendar(scope: string | null): boolean {
  if (!scope) return false;
  return scope.split(/[\s,]+/).includes(CALENDAR_SCOPE);
}

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}
