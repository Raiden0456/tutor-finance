import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { and, asc, eq, gte, isNotNull, isNull, lte } from 'drizzle-orm';
import {
  DEFAULT_TIMEZONE,
  civilDate,
  civilDateToUtc,
  rezone,
  zonedParts,
  type Currency,
  type LessonFrequency,
} from '@tutor-finance/shared';
import { RedisCacheService } from '../cache/redis-cache.service.js';
import { env } from '../config.js';
import { DB } from '../db/db.module.js';
import type { Database } from '../db/client.js';
import { recurringLessons, lessons, students, userSettings } from '../db/schema.js';
import { getUserTimeZone } from '../settings/user-timezone.js';
import { GoogleCalendarService } from '../google-calendar/google-calendar.service.js';
import type {
  CreateRecurringLessonDto,
  RecurringLessonResponse,
  UpdateRecurringLessonDto,
} from './recurring-lessons.dto.js';

type Row = typeof recurringLessons.$inferSelect;

const LOOKAHEAD_DAYS = 14;
const DAY_MS = 24 * 3600 * 1000;
const WEEK_MS = 7 * DAY_MS;

function addDays(civil: Date, days: number): Date {
  return new Date(civil.getTime() + days * DAY_MS);
}

function toCivilDate(value: string, timeZone: string): Date {
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return new Date(`${value}T00:00:00Z`);
  return civilDate(new Date(value), timeZone);
}

function nextGenerationCursor(
  startDate: Date,
  daysOfWeek: number[],
  startTime: string,
  timeZone: string,
  from = new Date(),
): Date {
  const today = civilDate(from, timeZone);
  let d = startDate > today ? startDate : today;

  for (let i = 0; i <= 7; i++) {
    if (daysOfWeek.includes(d.getUTCDay())) {
      const startsAt = civilDateToUtc(d, timeZone, startTime);
      if (startsAt >= from) return startsAt;
    }
    d = addDays(d, 1);
  }

  return civilDateToUtc(d, timeZone, startTime);
}

function toResponse(r: Row): RecurringLessonResponse {
  return {
    id: r.id,
    studentId: r.studentId,
    daysOfWeek: r.daysOfWeek,
    startTime: r.startTime,
    durationMin: r.durationMin,
    frequency: r.frequency as LessonFrequency,
    startDate: r.startDate.toISOString(),
    endDate: r.endDate?.toISOString() ?? null,
    nextScheduledAt: r.nextScheduledAt.toISOString(),
    isActive: r.isActive,
    priceOverride:
      r.priceOverrideAmount !== null && r.priceOverrideCurrency !== null
        ? { amount: r.priceOverrideAmount, currency: r.priceOverrideCurrency as Currency }
        : null,
    meetingLink: r.meetingLink,
    notes: r.notes,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
  };
}

@Injectable()
export class RecurringLessonsService implements OnModuleInit {
  constructor(
    @Inject(DB) private readonly db: Database,
    private readonly cacheService: RedisCacheService,
    private readonly calendar: GoogleCalendarService,
  ) {}

  async onModuleInit() {
    await this.dispatch();
  }

  async list(userId: string): Promise<RecurringLessonResponse[]> {
    const cacheKey = `user:${userId}:recurring-lessons:list`;
    const cached = await this.cacheService.getJson<RecurringLessonResponse[]>(cacheKey);
    if (cached) return cached;

    const rows = await this.db
      .select()
      .from(recurringLessons)
      .where(and(eq(recurringLessons.userId, userId), isNull(recurringLessons.deletedAt)))
      .orderBy(asc(recurringLessons.startTime));
    const response = rows.map(toResponse);
    await this.cacheService.setJson(cacheKey, response, env.cache.dataTtlSeconds);
    return response;
  }

  async create(userId: string, input: CreateRecurringLessonDto): Promise<RecurringLessonResponse> {
    const [student] = await this.db
      .select({ id: students.id, meetingLink: students.meetingLink })
      .from(students)
      .where(and(eq(students.id, input.studentId), eq(students.userId, userId)))
      .limit(1);
    if (!student) throw new NotFoundException('Student not found');

    const timeZone = await getUserTimeZone(this.db, userId);
    const startDate = input.startDate
      ? toCivilDate(input.startDate, timeZone)
      : civilDate(new Date(), timeZone);

    const nextAt = nextGenerationCursor(startDate, input.daysOfWeek, input.startTime, timeZone);

    const [row] = await this.db
      .insert(recurringLessons)
      .values({
        userId,
        studentId: input.studentId,
        daysOfWeek: input.daysOfWeek,
        startTime: input.startTime,
        durationMin: input.durationMin,
        frequency: input.frequency,
        startDate,
        endDate: input.endDate ? toCivilDate(input.endDate, timeZone) : null,
        nextScheduledAt: nextAt,
        isActive: true,
        priceOverrideAmount: input.priceOverride?.amount ?? null,
        priceOverrideCurrency: input.priceOverride?.currency ?? null,
        meetingLink: input.meetingLink ?? student.meetingLink ?? null,
        notes: input.notes ?? null,
      })
      .returning();

    await this.invalidateUserCache(userId);
    await this.dispatch();
    return toResponse(row!);
  }

  async update(
    userId: string,
    id: string,
    patch: UpdateRecurringLessonDto,
  ): Promise<RecurringLessonResponse> {
    if (Object.keys(patch).length === 0) {
      throw new BadRequestException('PATCH body must not be empty');
    }

    const set: Partial<typeof recurringLessons.$inferInsert> = {};
    const timeZone = await getUserTimeZone(this.db, userId);

    if (patch.isActive === true) {
      const [current] = await this.db
        .select()
        .from(recurringLessons)
        .where(
          and(
            eq(recurringLessons.id, id),
            eq(recurringLessons.userId, userId),
            isNull(recurringLessons.deletedAt),
          ),
        )
        .limit(1);
      if (!current) throw new NotFoundException('Recurring lesson schedule not found');

      set.nextScheduledAt = nextGenerationCursor(
        current.startDate,
        patch.daysOfWeek ?? current.daysOfWeek,
        patch.startTime ?? current.startTime,
        timeZone,
      );
    }

    if (patch.daysOfWeek !== undefined) set.daysOfWeek = patch.daysOfWeek;
    if (patch.startTime !== undefined) set.startTime = patch.startTime;
    if (patch.durationMin !== undefined) set.durationMin = patch.durationMin;
    if (patch.frequency !== undefined) set.frequency = patch.frequency;
    if (patch.endDate !== undefined)
      set.endDate = patch.endDate ? toCivilDate(patch.endDate, timeZone) : null;
    if (patch.isActive !== undefined) set.isActive = patch.isActive;
    if (patch.meetingLink !== undefined) set.meetingLink = patch.meetingLink ?? null;
    if (patch.notes !== undefined) set.notes = patch.notes ?? null;
    if (patch.priceOverride !== undefined) {
      if (patch.priceOverride === null) {
        set.priceOverrideAmount = null;
        set.priceOverrideCurrency = null;
      } else {
        set.priceOverrideAmount = patch.priceOverride.amount;
        set.priceOverrideCurrency = patch.priceOverride.currency;
      }
    }

    const [row] = await this.db
      .update(recurringLessons)
      .set(set)
      .where(
        and(
          eq(recurringLessons.id, id),
          eq(recurringLessons.userId, userId),
          isNull(recurringLessons.deletedAt),
        ),
      )
      .returning();
    if (!row) throw new NotFoundException('Recurring lesson schedule not found');
    if (patch.isActive === false) await this.deleteFutureScheduledOccurrences(userId, id);
    await this.invalidateUserCache(userId);
    if (patch.isActive === true) await this.dispatch();
    return toResponse(row);
  }

  async remove(userId: string, id: string): Promise<boolean> {
    const [row] = await this.db
      .update(recurringLessons)
      .set({ deletedAt: new Date() })
      .where(
        and(
          eq(recurringLessons.id, id),
          eq(recurringLessons.userId, userId),
          isNull(recurringLessons.deletedAt),
        ),
      )
      .returning({ id: recurringLessons.id });
    if (row) await this.invalidateUserCache(userId);
    return !!row;
  }

  @Cron('0 7 * * *')
  async dispatch() {
    const now = new Date();
    const horizon = new Date(now.getTime() + LOOKAHEAD_DAYS * DAY_MS);

    const due = await this.db
      .select({ schedule: recurringLessons, timezone: userSettings.timezone })
      .from(recurringLessons)
      .leftJoin(userSettings, eq(userSettings.userId, recurringLessons.userId))
      .where(
        and(
          eq(recurringLessons.isActive, true),
          isNull(recurringLessons.deletedAt),
          lte(recurringLessons.nextScheduledAt, horizon),
        ),
      );

    const freqWeeks = (f: LessonFrequency) => (f === 'biweekly' ? 2 : 1);

    for (const { schedule, timezone } of due) {
      const timeZone = timezone ?? DEFAULT_TIMEZONE;
      const today = civilDate(now, timeZone);
      const lastDay = civilDate(horizon, timeZone);
      let d = civilDate(schedule.nextScheduledAt, timeZone);
      if (d < today) d = today;
      if (d < schedule.startDate) d = schedule.startDate;

      const insertedLessonIds: string[] = [];
      await this.db.transaction(async (tx) => {
        while (d <= lastDay) {
          if (schedule.endDate && d > schedule.endDate) break;

          if (schedule.daysOfWeek.includes(d.getUTCDay())) {
            const weeksSinceStart = Math.floor(
              (d.getTime() - schedule.startDate.getTime()) / WEEK_MS,
            );
            if (weeksSinceStart % freqWeeks(schedule.frequency as LessonFrequency) === 0) {
              const startsAt = civilDateToUtc(d, timeZone, schedule.startTime);
              if (startsAt >= now) {
                const inserted = await tx
                  .insert(lessons)
                  .values({
                    userId: schedule.userId,
                    studentId: schedule.studentId,
                    startsAt,
                    durationMin: schedule.durationMin,
                    status: 'scheduled',
                    priceOverrideAmount: schedule.priceOverrideAmount,
                    priceOverrideCurrency: schedule.priceOverrideCurrency,
                    meetingLink: schedule.meetingLink,
                    notes: schedule.notes,
                    recurringLessonId: schedule.id,
                  })
                  .onConflictDoNothing({
                    target: [lessons.recurringLessonId, lessons.startsAt],
                  })
                  .returning({ id: lessons.id });
                if (inserted[0]) insertedLessonIds.push(inserted[0].id);
              }
            }
          }

          d = addDays(d, 1);
        }

        await tx
          .update(recurringLessons)
          .set({ nextScheduledAt: civilDateToUtc(d, timeZone) })
          .where(eq(recurringLessons.id, schedule.id));
      });

      for (const lessonId of insertedLessonIds) {
        await this.calendar.enqueueUpsert(schedule.userId, lessonId);
      }
      await this.invalidateUserCache(schedule.userId);
    }
  }

  async rezone(userId: string, fromTimeZone: string, toTimeZone: string): Promise<void> {
    const schedules = await this.db
      .select({ id: recurringLessons.id, nextScheduledAt: recurringLessons.nextScheduledAt })
      .from(recurringLessons)
      .where(and(eq(recurringLessons.userId, userId), isNull(recurringLessons.deletedAt)));

    const upcoming = await this.db
      .select({
        id: lessons.id,
        startsAt: lessons.startsAt,
        startTime: recurringLessons.startTime,
      })
      .from(lessons)
      .innerJoin(recurringLessons, eq(recurringLessons.id, lessons.recurringLessonId))
      .where(
        and(
          eq(lessons.userId, userId),
          isNotNull(lessons.recurringLessonId),
          eq(lessons.status, 'scheduled'),
          isNull(lessons.archivedAt),
          gte(lessons.startsAt, new Date()),
        ),
      );

    const movedLessonIds: string[] = [];
    await this.db.transaction(async (tx) => {
      for (const schedule of schedules) {
        await tx
          .update(recurringLessons)
          .set({ nextScheduledAt: rezone(schedule.nextScheduledAt, fromTimeZone, toTimeZone) })
          .where(eq(recurringLessons.id, schedule.id));
      }

      for (const lesson of upcoming) {
        const local = zonedParts(lesson.startsAt, fromTimeZone);
        const hhmm = `${String(local.hour).padStart(2, '0')}:${String(local.minute).padStart(2, '0')}`;
        if (hhmm !== lesson.startTime) continue;
        const startsAt = rezone(lesson.startsAt, fromTimeZone, toTimeZone);
        if (startsAt.getTime() === lesson.startsAt.getTime()) continue;
        await tx.update(lessons).set({ startsAt }).where(eq(lessons.id, lesson.id));
        movedLessonIds.push(lesson.id);
      }
    });

    for (const lessonId of movedLessonIds) {
      await this.calendar.enqueueUpsert(userId, lessonId);
    }
    await this.invalidateUserCache(userId);
  }

  private async deleteFutureScheduledOccurrences(userId: string, recurringLessonId: string) {
    const removed = await this.db
      .delete(lessons)
      .where(
        and(
          eq(lessons.userId, userId),
          eq(lessons.recurringLessonId, recurringLessonId),
          eq(lessons.status, 'scheduled'),
          isNull(lessons.archivedAt),
          gte(lessons.startsAt, new Date()),
        ),
      )
      .returning({ googleEventId: lessons.googleEventId });
    for (const row of removed) {
      await this.calendar.enqueueDelete(userId, row.googleEventId);
    }
  }

  private async invalidateUserCache(userId: string): Promise<void> {
    await Promise.all([
      this.cacheService.deleteByPrefix(`user:${userId}:recurring-lessons:`),
      this.cacheService.deleteByPrefix(`user:${userId}:lessons:`),
      this.cacheService.deleteByPrefix(`user:${userId}:dashboard:`),
    ]);
  }
}
