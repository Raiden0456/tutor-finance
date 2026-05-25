import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { and, asc, eq, gte, isNull, lte } from 'drizzle-orm';
import type { Currency, LessonFrequency } from '@tutor-finance/shared';
import { RedisCacheService } from '../cache/redis-cache.service.js';
import { env } from '../config.js';
import { DB } from '../db/db.module.js';
import type { Database } from '../db/client.js';
import { recurringLessons, lessons, students } from '../db/schema.js';
import type {
  CreateRecurringLessonDto,
  RecurringLessonResponse,
  UpdateRecurringLessonDto,
} from './recurring-lessons.dto.js';

type Row = typeof recurringLessons.$inferSelect;

const LOOKAHEAD_DAYS = 14;

function startOfUtcDay(date: Date): Date {
  const d = new Date(date);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

function firstOccurrence(from: Date, daysOfWeek: number[]): Date {
  const d = startOfUtcDay(from);
  for (let i = 0; i < 7; i++) {
    if (daysOfWeek.includes(d.getUTCDay())) return d;
    d.setUTCDate(d.getUTCDate() + 1);
  }
  return d;
}

function applyTime(date: Date, startTime: string): Date {
  const [h, m] = startTime.split(':').map(Number);
  const d = new Date(date);
  d.setUTCHours(h!, m!, 0, 0);
  return d;
}

function addDay(date: Date): Date {
  const d = new Date(date);
  d.setUTCDate(d.getUTCDate() + 1);
  return d;
}

function nextGenerationCursor(
  startDate: Date,
  daysOfWeek: number[],
  startTime: string,
  from = new Date(),
): Date {
  const today = startOfUtcDay(from);
  const scheduleStart = startOfUtcDay(startDate);
  let d = scheduleStart > today ? scheduleStart : today;

  for (let i = 0; i <= 7; i++) {
    if (daysOfWeek.includes(d.getUTCDay())) {
      const startsAt = applyTime(d, startTime);
      if (startsAt >= from) return startsAt;
    }
    d = addDay(d);
  }

  return applyTime(firstOccurrence(d, daysOfWeek), startTime);
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
      .select({ id: students.id })
      .from(students)
      .where(and(eq(students.id, input.studentId), eq(students.userId, userId)))
      .limit(1);
    if (!student) throw new NotFoundException('Student not found');

    const startDate = input.startDate ? new Date(input.startDate) : new Date();
    startDate.setUTCHours(0, 0, 0, 0);

    const nextAt = nextGenerationCursor(startDate, input.daysOfWeek, input.startTime);

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
        endDate: input.endDate ? new Date(input.endDate) : null,
        nextScheduledAt: nextAt,
        isActive: true,
        priceOverrideAmount: input.priceOverride?.amount ?? null,
        priceOverrideCurrency: input.priceOverride?.currency ?? null,
        meetingLink: input.meetingLink ?? null,
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
      );
    }

    if (patch.daysOfWeek !== undefined) set.daysOfWeek = patch.daysOfWeek;
    if (patch.startTime !== undefined) set.startTime = patch.startTime;
    if (patch.durationMin !== undefined) set.durationMin = patch.durationMin;
    if (patch.frequency !== undefined) set.frequency = patch.frequency;
    if (patch.endDate !== undefined) set.endDate = patch.endDate ? new Date(patch.endDate) : null;
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
    const horizon = new Date(now);
    horizon.setUTCDate(horizon.getUTCDate() + LOOKAHEAD_DAYS);

    const due = await this.db
      .select()
      .from(recurringLessons)
      .where(
        and(
          eq(recurringLessons.isActive, true),
          isNull(recurringLessons.deletedAt),
          lte(recurringLessons.nextScheduledAt, horizon),
        ),
      );

    const freqWeeks = (f: LessonFrequency) => (f === 'biweekly' ? 2 : 1);

    for (const schedule of due) {
      let d = startOfUtcDay(schedule.nextScheduledAt);
      const today = startOfUtcDay(now);
      const scheduleStart = startOfUtcDay(schedule.startDate);
      if (d < today) d = today;
      if (d < scheduleStart) d = scheduleStart;

      await this.db.transaction(async (tx) => {
        while (d <= horizon) {
          if (schedule.endDate && d > schedule.endDate) break;

          if (schedule.daysOfWeek.includes(d.getUTCDay())) {
            const msPerWeek = 7 * 24 * 3600 * 1000;
            const weeksSinceStart = Math.floor(
              (d.getTime() - schedule.startDate.getTime()) / msPerWeek,
            );
            if (weeksSinceStart % freqWeeks(schedule.frequency as LessonFrequency) === 0) {
              const startsAt = applyTime(d, schedule.startTime);
              if (startsAt >= now) {
                await tx
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
                  });
              }
            }
          }

          d = addDay(d);
        }

        await tx
          .update(recurringLessons)
          .set({ nextScheduledAt: d })
          .where(eq(recurringLessons.id, schedule.id));
      });

      await this.invalidateUserCache(schedule.userId);
    }
  }

  private async deleteFutureScheduledOccurrences(userId: string, recurringLessonId: string) {
    await this.db
      .delete(lessons)
      .where(
        and(
          eq(lessons.userId, userId),
          eq(lessons.recurringLessonId, recurringLessonId),
          eq(lessons.status, 'scheduled'),
          isNull(lessons.archivedAt),
          gte(lessons.startsAt, new Date()),
        ),
      );
  }

  private async invalidateUserCache(userId: string): Promise<void> {
    await Promise.all([
      this.cacheService.deleteByPrefix(`user:${userId}:recurring-lessons:`),
      this.cacheService.deleteByPrefix(`user:${userId}:lessons:`),
      this.cacheService.deleteByPrefix(`user:${userId}:dashboard:`),
    ]);
  }
}
