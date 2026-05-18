import { Inject, Injectable, NotFoundException, OnModuleInit } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { and, asc, eq, isNull, lte } from 'drizzle-orm';
import type { Currency, Frequency } from '@tutor-finance/shared';
import { RedisCacheService } from '../cache/redis-cache.service.js';
import { env } from '../config.js';
import { DB } from '../db/db.module.js';
import type { Database } from '../db/client.js';
import { recurringExpenses, transactions } from '../db/schema.js';
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

function calcNextDue(d: Date, freq: Frequency): Date {
  const next = new Date(d);
  switch (freq) {
    case 'daily':
      next.setDate(next.getDate() + 1);
      break;
    case 'weekly':
      next.setDate(next.getDate() + 7);
      break;
    case 'monthly':
      next.setMonth(next.getMonth() + 1);
      break;
    case 'yearly':
      next.setFullYear(next.getFullYear() + 1);
      break;
  }
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
    const startDate = input.startDate ? new Date(input.startDate) : new Date();
    startDate.setHours(0, 0, 0, 0);
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
        nextDueAt: startDate,
        isActive: true,
      })
      .returning();
    await this.invalidateUserCache(userId);
    // dispatch immediately if start date is today or past
    await this.dispatch();
    return toResponse(row!);
  }

  async update(userId: string, id: string, patch: UpdateRecurringDto): Promise<RecurringResponse> {
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
      .select()
      .from(recurringExpenses)
      .where(
        and(
          eq(recurringExpenses.isActive, true),
          isNull(recurringExpenses.deletedAt),
          lte(recurringExpenses.nextDueAt, now),
        ),
      );

    for (const expense of due) {
      let nextDue = new Date(expense.nextDueAt);
      let count = 0;
      while (nextDue <= now && count < 366) {
        await this.db.insert(transactions).values({
          userId: expense.userId,
          type: 'expense',
          amount: expense.amount,
          currency: expense.currency,
          occurredAt: new Date(nextDue),
          category: expense.category,
          description: expense.description,
          recurringExpenseId: expense.id,
        });
        nextDue = calcNextDue(nextDue, expense.frequency as Frequency);
        count++;
      }
      await this.db
        .update(recurringExpenses)
        .set({ nextDueAt: nextDue })
        .where(eq(recurringExpenses.id, expense.id));
      await this.invalidateUserCache(expense.userId);
    }
  }

  private async invalidateUserCache(userId: string): Promise<void> {
    await Promise.all([
      this.cacheService.deleteByPrefix(`user:${userId}:recurring:`),
      this.cacheService.deleteByPrefix(`user:${userId}:transactions:`),
      this.cacheService.deleteByPrefix(`user:${userId}:dashboard:`),
    ]);
  }
}
