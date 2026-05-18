import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { and, desc, eq, gte, lte, sql, type SQL } from 'drizzle-orm';
import { convertMoney, type Currency, type TransactionType } from '@tutor-finance/shared';
import { RedisCacheService } from '../cache/redis-cache.service.js';
import { DB } from '../db/db.module.js';
import type { Database } from '../db/client.js';
import { transactions } from '../db/schema.js';
import { FxService } from '../fx/fx.service.js';
import type {
  CreateTransactionDto,
  TransactionFilterDto,
  TransactionResponse,
  UpdateTransactionDto,
} from './transactions.dto.js';

type Row = typeof transactions.$inferSelect;

function baseResponse(r: Row): Omit<TransactionResponse, 'convertedAmount'> {
  return {
    id: r.id,
    type: r.type as TransactionType,
    amount: r.amount,
    currency: r.currency as Currency,
    occurredAt: r.occurredAt,
    category: r.category,
    studentId: r.studentId,
    lessonId: r.lessonId,
    description: r.description,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
  };
}

function withConverted(
  r: Row,
  target: Currency | undefined,
  rates: Record<string, number>,
): TransactionResponse {
  const base = baseResponse(r);
  let convertedAmount: number | null = null;
  if (target) {
    if (r.currency === target) {
      convertedAmount = r.amount;
    } else {
      try {
        const c = convertMoney(
          { amount: r.amount, currency: r.currency as Currency },
          target,
          rates,
        );
        convertedAmount = c.amount;
      } catch {
        convertedAmount = null;
      }
    }
  }
  return { ...base, convertedAmount };
}

@Injectable()
export class TransactionsService {
  constructor(
    @Inject(DB) private readonly db: Database,
    private readonly fx: FxService,
    private readonly cacheService: RedisCacheService,
  ) {}

  async list(
    userId: string,
    filter: TransactionFilterDto | undefined,
  ): Promise<TransactionResponse[]> {
    const conds: SQL[] = [eq(transactions.userId, userId)];
    if (filter?.type) conds.push(eq(transactions.type, filter.type));
    if (filter?.studentId) conds.push(eq(transactions.studentId, filter.studentId));
    if (filter?.from) conds.push(gte(transactions.occurredAt, new Date(filter.from)));
    if (filter?.to) conds.push(lte(transactions.occurredAt, new Date(filter.to)));

    const limit = Math.min(filter?.limit ?? 200, 1000);
    const rows = await this.db
      .select()
      .from(transactions)
      .where(and(...conds))
      .orderBy(desc(transactions.occurredAt))
      .limit(limit);

    let rates: Record<string, number> = {};
    if (filter?.target) {
      try {
        rates = await this.fx.getRatesMap();
      } catch {
        rates = {};
      }
    }
    return rows.map((r) => withConverted(r, filter?.target, rates));
  }

  async findById(userId: string, id: string): Promise<TransactionResponse> {
    const [row] = await this.db
      .select()
      .from(transactions)
      .where(and(eq(transactions.id, id), eq(transactions.userId, userId)))
      .limit(1);
    if (!row) throw new NotFoundException('Transaction not found');
    return { ...baseResponse(row), convertedAmount: null };
  }

  async create(userId: string, input: CreateTransactionDto): Promise<TransactionResponse> {
    const inserted = await this.db
      .insert(transactions)
      .values({
        userId,
        type: input.type,
        amount: input.amount,
        currency: input.currency,
        occurredAt: new Date(input.occurredAt),
        category: input.category,
        studentId: input.studentId ?? null,
        description: input.description ?? null,
      })
      .returning();
    await this.invalidateDashboard(userId);
    return { ...baseResponse(inserted[0]!), convertedAmount: null };
  }

  async update(
    userId: string,
    id: string,
    patch: UpdateTransactionDto,
  ): Promise<TransactionResponse> {
    const set: Partial<typeof transactions.$inferInsert> = {};
    if (patch.amount !== undefined) set.amount = patch.amount;
    if (patch.currency !== undefined) set.currency = patch.currency;
    if (patch.occurredAt !== undefined) set.occurredAt = new Date(patch.occurredAt);
    if (patch.category !== undefined) set.category = patch.category;
    if (patch.studentId !== undefined) set.studentId = patch.studentId || null;
    if (patch.description !== undefined) set.description = patch.description || null;

    const [row] = await this.db
      .update(transactions)
      .set(set)
      .where(and(eq(transactions.id, id), eq(transactions.userId, userId)))
      .returning();
    if (!row) throw new NotFoundException('Transaction not found');
    await this.invalidateDashboard(userId);
    return { ...baseResponse(row), convertedAmount: null };
  }

  async remove(userId: string, id: string): Promise<boolean> {
    const res = await this.db
      .delete(transactions)
      .where(and(eq(transactions.id, id), eq(transactions.userId, userId)))
      .returning({ id: transactions.id });
    if (res.length > 0) await this.invalidateDashboard(userId);
    return res.length > 0;
  }

  async upsertForLesson(args: {
    userId: string;
    lessonId: string;
    studentId: string;
    amount: number;
    currency: string;
    occurredAt: Date;
    description?: string;
  }) {
    await this.db
      .insert(transactions)
      .values({
        userId: args.userId,
        lessonId: args.lessonId,
        studentId: args.studentId,
        type: 'income',
        amount: args.amount,
        currency: args.currency,
        occurredAt: args.occurredAt,
        category: 'lesson',
        description: args.description ?? null,
      })
      .onConflictDoUpdate({
        target: [transactions.userId, transactions.lessonId],
        set: {
          type: 'income',
          amount: args.amount,
          currency: args.currency,
          occurredAt: args.occurredAt,
          category: 'lesson',
          studentId: args.studentId,
          description: args.description ?? null,
        },
      });
    await this.invalidateDashboard(args.userId);
  }

  async deleteForLesson(userId: string, lessonId: string) {
    await this.db
      .delete(transactions)
      .where(and(eq(transactions.userId, userId), eq(transactions.lessonId, lessonId)));
    await this.invalidateDashboard(userId);
  }

  async monthSummary(userId: string, from: Date, to: Date) {
    const rows = await this.db
      .select({
        type: transactions.type,
        currency: transactions.currency,
        total: sql<number>`sum(${transactions.amount})::int`,
        count: sql<number>`count(*)::int`,
      })
      .from(transactions)
      .where(
        and(
          eq(transactions.userId, userId),
          gte(transactions.occurredAt, from),
          lte(transactions.occurredAt, to),
        ),
      )
      .groupBy(transactions.type, transactions.currency);
    return rows.map((r) => ({
      type: r.type as 'income' | 'expense',
      currency: r.currency,
      total: Number(r.total ?? 0),
      count: Number(r.count ?? 0),
    }));
  }

  private async invalidateDashboard(userId: string): Promise<void> {
    await this.cacheService.deleteByPrefix(`user:${userId}:dashboard:`);
  }
}
