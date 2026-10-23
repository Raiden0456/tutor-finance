import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { and, asc, eq, isNull, lte } from 'drizzle-orm';
import {
  DEFAULT_TIMEZONE,
  civilDate,
  civilDateToUtc,
  rezone,
  type Currency,
  type Frequency,
} from '@tutor-finance/shared';
import { RedisCacheService } from '../cache/redis-cache.service.js';
import { env } from '../config.js';
import { DB } from '../db/db.module.js';
import type { Database } from '../db/client.js';
import { recurringExpenses, transactions, userSettings } from '../db/schema.js';
import { getUserTimeZone } from '../settings/user-timezone.js';
import type { CreateRecurringDto, RecurringResponse, UpdateRecurringDto } from './recurring.dto.js';

type Row = typeof recurringExpenses.$inferSelect;

function toResponse(r: Row): RecurringResponse {
  return {
    id: r.id,
    amount: r.amount,
    currency: r.currency as Currency,
    category: r.category,
    description: r.description,
    frequency: r.frequency as Frequency,
    startDate: r.startDate,
    nextDueAt: r.nextDueAt,
    isActive: r.isActive,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
  };
}

const DAY_MS = 24 * 3600 * 1000;
const MAX_CATCH_UP = 366;

function toCivilDate(value: string, timeZone: string): Date {
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return new Date(`${value}T00:00:00Z`);
  return civilDate(new Date(value), timeZone);
}

function addMonthsClamped(anchor: Date, months: number): Date {
  const y = anchor.getUTCFullYear();
  const m = anchor.getUTCMonth() + months;
  const lastDay = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
  return new Date(Date.UTC(y, m, Math.min(anchor.getUTCDate(), lastDay)));
}

function firstOccurrenceOnOrAfter(anchor: Date, cursor: Date, freq: Frequency): Date {
  if (cursor <= anchor) return anchor;
  if (freq === 'daily') return cursor;
  if (freq === 'weekly') {
    const weeks = Math.ceil((cursor.getTime() - anchor.getTime()) / (7 * DAY_MS));
    return new Date(anchor.getTime() + weeks * 7 * DAY_MS);
  }
  const step = freq === 'yearly' ? 12 : 1;
  const monthsApart =
    (cursor.getUTCFullYear() - anchor.getUTCFullYear()) * 12 +
    cursor.getUTCMonth() -
    anchor.getUTCMonth();
  let k = Math.max(0, Math.floor(monthsApart / step));
  let next = addMonthsClamped(anchor, k * step);
  while (next < cursor) next = addMonthsClamped(anchor, ++k * step);
  return next;
}

@Injectable()
export class RecurringService implements OnModuleInit {
  constructor(
    @Inject(DB) private readonly db: Database,
    private readonly cacheService: RedisCacheService,
  ) {}

  async onModuleInit() {
    await this.dispatch();
  }

  async list(userId: string): Promise<RecurringResponse[]> {
    const cacheKey = `user:${userId}:recurring:list`;
    const cached = await this.cacheService.getJson<RecurringResponse[]>(cacheKey);
    if (cached) return cached;

    const rows = await this.db
      .select()
      .from(recurringExpenses)
      .where(and(eq(recurringExpenses.userId, userId), isNull(recurringExpenses.deletedAt)))
      .orderBy(asc(recurringExpenses.createdAt));
    const response = rows.map(toResponse);
    await this.cacheService.setJson(cacheKey, response, env.cache.dataTtlSeconds);
    return response;
  }

  async create(userId: string, input: CreateRecurringDto): Promise<RecurringResponse> {
    const timeZone = await getUserTimeZone(this.db, userId);
    const startDate = input.startDate
      ? toCivilDate(input.startDate, timeZone)
      : civilDate(new Date(), timeZone);
    const [row] = await this.db
      .insert(recurringExpenses)
      .values({
        userId,
        amount: input.amount,
        currency: input.currency,
        category: input.category,
        description: input.description ?? null,
        frequency: input.frequency,
        startDate,
        nextDueAt: civilDateToUtc(startDate, timeZone),
        isActive: true,
      })
      .returning();
    await this.invalidateUserCache(userId);
    await this.dispatch();
    return toResponse(row!);
  }

  async update(userId: string, id: string, patch: UpdateRecurringDto): Promise<RecurringResponse> {
    if (Object.keys(patch).length === 0) {
      throw new BadRequestException('PATCH body must not be empty');
    }

    const set: Partial<typeof recurringExpenses.$inferInsert> = {};
    if (patch.amount !== undefined) set.amount = patch.amount;
    if (patch.currency !== undefined) set.currency = patch.currency;
    if (patch.category !== undefined) set.category = patch.category;
    if (patch.description !== undefined) set.description = patch.description || null;
    if (patch.frequency !== undefined) set.frequency = patch.frequency;
    if (patch.isActive !== undefined) set.isActive = patch.isActive;

    const [row] = await this.db
      .update(recurringExpenses)
      .set(set)
      .where(
        and(
          eq(recurringExpenses.id, id),
          eq(recurringExpenses.userId, userId),
          isNull(recurringExpenses.deletedAt),
        ),
      )
      .returning();
    if (!row) throw new NotFoundException('Recurring expense not found');
    await this.invalidateUserCache(userId);
    return toResponse(row);
  }

  async remove(userId: string, id: string): Promise<boolean> {
    const [row] = await this.db
      .update(recurringExpenses)
      .set({ deletedAt: new Date() })
      .where(
        and(
          eq(recurringExpenses.id, id),
          eq(recurringExpenses.userId, userId),
          isNull(recurringExpenses.deletedAt),
        ),
      )
      .returning({ id: recurringExpenses.id });
    if (row) await this.invalidateUserCache(userId);
    return !!row;
  }

  @Cron('0 * * * *')
  async dispatch() {
    const now = new Date();
    const due = await this.db
      .select({ expense: recurringExpenses, timezone: userSettings.timezone })
      .from(recurringExpenses)
      .leftJoin(userSettings, eq(userSettings.userId, recurringExpenses.userId))
      .where(
        and(
          eq(recurringExpenses.isActive, true),
          isNull(recurringExpenses.deletedAt),
          lte(recurringExpenses.nextDueAt, now),
        ),
      );

    for (const { expense, timezone } of due) {
      const timeZone = timezone ?? DEFAULT_TIMEZONE;
      const freq = expense.frequency as Frequency;
      const anchor = civilDate(expense.startDate, 'UTC');
      let day = firstOccurrenceOnOrAfter(anchor, civilDate(expense.nextDueAt, timeZone), freq);
      let dueAt = civilDateToUtc(day, timeZone);
      let count = 0;
      await this.db.transaction(async (tx) => {
        while (dueAt <= now && count < MAX_CATCH_UP) {
          await tx
            .insert(transactions)
            .values({
              userId: expense.userId,
              type: 'expense',
              amount: expense.amount,
              currency: expense.currency,
              occurredAt: dueAt,
              category: expense.category,
              description: expense.description,
              recurringExpenseId: expense.id,
            })
            .onConflictDoNothing({
              target: [transactions.recurringExpenseId, transactions.occurredAt],
            });
          day = firstOccurrenceOnOrAfter(anchor, new Date(day.getTime() + DAY_MS), freq);
          dueAt = civilDateToUtc(day, timeZone);
          count++;
        }
        await tx
          .update(recurringExpenses)
          .set({ nextDueAt: dueAt })
          .where(eq(recurringExpenses.id, expense.id));
      });
      await this.invalidateUserCache(expense.userId);
    }
  }

  async rezone(userId: string, fromTimeZone: string, toTimeZone: string): Promise<void> {
    const rows = await this.db
      .select({ id: recurringExpenses.id, nextDueAt: recurringExpenses.nextDueAt })
      .from(recurringExpenses)
      .where(and(eq(recurringExpenses.userId, userId), isNull(recurringExpenses.deletedAt)));
    if (rows.length === 0) return;
    await this.db.transaction(async (tx) => {
      for (const row of rows) {
        await tx
          .update(recurringExpenses)
          .set({ nextDueAt: rezone(row.nextDueAt, fromTimeZone, toTimeZone) })
          .where(eq(recurringExpenses.id, row.id));
      }
    });
    await this.invalidateUserCache(userId);
  }

  private async invalidateUserCache(userId: string): Promise<void> {
    await Promise.all([
      this.cacheService.deleteByPrefix(`user:${userId}:recurring:`),
      this.cacheService.deleteByPrefix(`user:${userId}:transactions:`),
      this.cacheService.deleteByPrefix(`user:${userId}:dashboard:`),
    ]);
  }
}
