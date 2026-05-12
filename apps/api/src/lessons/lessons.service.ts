import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { and, asc, desc, eq, gte, inArray, lt, lte, not, sql, type SQL } from 'drizzle-orm';
import type { Currency, LessonStatus } from '@tutor-finance/shared';
import { DB } from '../db/db.module.js';
import type { Database } from '../db/client.js';
import { lessons, students } from '../db/schema.js';
import { TransactionsService } from '../transactions/transactions.service.js';
import type {
  CreateLessonDto,
  LessonFilterDto,
  LessonResponse,
  UpdateLessonDto,
} from './lessons.dto.js';

type Row = typeof lessons.$inferSelect;

const JOIN_COLS = {
  id: lessons.id,
  userId: lessons.userId,
  studentId: lessons.studentId,
  startsAt: lessons.startsAt,
  durationMin: lessons.durationMin,
  status: lessons.status,
  priceOverrideAmount: lessons.priceOverrideAmount,
  priceOverrideCurrency: lessons.priceOverrideCurrency,
  paidAmount: lessons.paidAmount,
  notes: lessons.notes,
  createdAt: lessons.createdAt,
  updatedAt: lessons.updatedAt,
  studentHourlyRateAmount: students.hourlyRateAmount,
  studentHourlyRateCurrency: students.hourlyRateCurrency,
};

type JoinRow = {
  id: string;
  userId: string;
  studentId: string;
  startsAt: Date;
  durationMin: number;
  status: string;
  priceOverrideAmount: number | null;
  priceOverrideCurrency: string | null;
  paidAmount: number | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
  studentHourlyRateAmount: number | null;
  studentHourlyRateCurrency: string | null;
};

function toResponse(r: JoinRow): LessonResponse {
  let effectivePrice: { amount: number; currency: Currency } | null = null;
  if (r.priceOverrideAmount !== null && r.priceOverrideCurrency !== null) {
    effectivePrice = {
      amount: r.priceOverrideAmount,
      currency: r.priceOverrideCurrency as Currency,
    };
  } else if (r.studentHourlyRateAmount !== null && r.studentHourlyRateCurrency !== null) {
    effectivePrice = {
      amount: Math.round((r.studentHourlyRateAmount * r.durationMin) / 60),
      currency: r.studentHourlyRateCurrency as Currency,
    };
  }
  return {
    id: r.id,
    studentId: r.studentId,
    startsAt: r.startsAt,
    durationMin: r.durationMin,
    status: r.status as LessonStatus,
    priceOverride:
      r.priceOverrideAmount !== null && r.priceOverrideCurrency !== null
        ? { amount: r.priceOverrideAmount, currency: r.priceOverrideCurrency as Currency }
        : null,
    paidAmount: r.paidAmount ?? null,
    effectivePrice,
    notes: r.notes,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
  };
}

const PAYMENT_STATUSES = ['paid', 'partially_paid'];

@Injectable()
export class LessonsService {
  constructor(
    @Inject(DB) private readonly db: Database,
    private readonly transactions: TransactionsService,
  ) {}

  async list(userId: string, filter: LessonFilterDto | undefined): Promise<LessonResponse[]> {
    await this.autoCompleteStale(userId);

    const conds: SQL[] = [eq(lessons.userId, userId)];
    if (filter?.studentId) conds.push(eq(lessons.studentId, filter.studentId));
    if (filter?.status) conds.push(eq(lessons.status, filter.status));
    if (filter?.from) conds.push(gte(lessons.startsAt, new Date(filter.from)));
    if (filter?.to) conds.push(lte(lessons.startsAt, new Date(filter.to)));

    const limit = Math.min(filter?.limit ?? 200, 1000);
    const rows = await this.db
      .select(JOIN_COLS)
      .from(lessons)
      .leftJoin(students, eq(lessons.studentId, students.id))
      .where(and(...conds))
      .orderBy(filter?.orderDir === 'asc' ? asc(lessons.startsAt) : desc(lessons.startsAt))
      .limit(limit);
    return rows.map((r) => toResponse(r as JoinRow));
  }

  private async autoCompleteStale(userId: string): Promise<void> {
    const stale = await this.db
      .select()
      .from(lessons)
      .where(
        and(
          eq(lessons.userId, userId),
          eq(lessons.status, 'scheduled'),
          lt(sql`${lessons.startsAt} + (${lessons.durationMin} * interval '1 minute')`, sql`now()`),
        ),
      );

    for (const row of stale) {
      await this.db
        .update(lessons)
        .set({ status: 'due' })
        .where(and(eq(lessons.id, row.id), eq(lessons.userId, userId)));
      // no syncTransaction — payment must be explicitly confirmed
    }
  }

  async findById(userId: string, id: string): Promise<LessonResponse> {
    const row = await this.findJoinRow(userId, id);
    return toResponse(row);
  }

  private async findJoinRow(userId: string, id: string): Promise<JoinRow> {
    const [row] = await this.db
      .select(JOIN_COLS)
      .from(lessons)
      .leftJoin(students, eq(lessons.studentId, students.id))
      .where(and(eq(lessons.id, id), eq(lessons.userId, userId)))
      .limit(1);
    if (!row) throw new NotFoundException('Lesson not found');
    return row as JoinRow;
  }

  private async findRowById(userId: string, id: string): Promise<Row> {
    const [row] = await this.db
      .select()
      .from(lessons)
      .where(and(eq(lessons.id, id), eq(lessons.userId, userId)))
      .limit(1);
    if (!row) throw new NotFoundException('Lesson not found');
    return row;
  }

  async create(userId: string, input: CreateLessonDto): Promise<LessonResponse> {
    const [row] = await this.db
      .insert(lessons)
      .values({
        userId,
        studentId: input.studentId,
        startsAt: new Date(input.startsAt),
        durationMin: input.durationMin,
        status: input.status,
        priceOverrideAmount: input.priceOverride?.amount ?? null,
        priceOverrideCurrency: input.priceOverride?.currency ?? null,
        notes: input.notes ?? null,
      })
      .returning();
    if (!row) throw new NotFoundException('Insert failed');
    if (PAYMENT_STATUSES.includes(row.status)) {
      await this.syncTransaction(userId, row);
    }
    return this.findById(userId, row.id);
  }

  async update(userId: string, id: string, patch: UpdateLessonDto): Promise<LessonResponse> {
    const before = await this.findRowById(userId, id);

    const set: Partial<typeof lessons.$inferInsert> = {};
    if (patch.startsAt !== undefined) set.startsAt = new Date(patch.startsAt);
    if (patch.durationMin !== undefined) set.durationMin = patch.durationMin;
    if (patch.status !== undefined) set.status = patch.status;
    if (patch.paidAmount !== undefined) set.paidAmount = patch.paidAmount;
    if (patch.priceOverride !== undefined) {
      set.priceOverrideAmount = patch.priceOverride.amount;
      set.priceOverrideCurrency = patch.priceOverride.currency;
    }
    if (patch.notes !== undefined) set.notes = patch.notes || null;

    const [row] = await this.db
      .update(lessons)
      .set(set)
      .where(and(eq(lessons.id, id), eq(lessons.userId, userId)))
      .returning();
    if (!row) throw new NotFoundException('Lesson not found');

    const wasPayment = PAYMENT_STATUSES.includes(before.status);
    const isPayment = PAYMENT_STATUSES.includes(row.status);

    if (isPayment) {
      await this.syncTransaction(userId, row);
    } else if (wasPayment) {
      await this.transactions.deleteForLesson(userId, row.id);
    }
    return this.findById(userId, row.id);
  }

  async remove(userId: string, id: string): Promise<boolean> {
    const row = await this.findRowById(userId, id);
    await this.db.delete(lessons).where(and(eq(lessons.id, id), eq(lessons.userId, userId)));
    if (['completed', 'paid', 'partially_paid'].includes(row.status)) {
      await this.transactions.deleteForLesson(userId, row.id);
    }
    return true;
  }

  private async syncTransaction(userId: string, lesson: Row) {
    let amount: number;
    let currency: Currency;

    if (lesson.status === 'partially_paid' && lesson.paidAmount !== null) {
      if (lesson.priceOverrideAmount !== null && lesson.priceOverrideCurrency !== null) {
        amount = lesson.paidAmount;
        currency = lesson.priceOverrideCurrency as Currency;
      } else {
        const [student] = await this.db
          .select()
          .from(students)
          .where(and(eq(students.id, lesson.studentId), eq(students.userId, userId)))
          .limit(1);
        if (!student) throw new NotFoundException('Student not found');
        amount = lesson.paidAmount;
        currency = student.hourlyRateCurrency as Currency;
      }
    } else {
      if (lesson.priceOverrideAmount !== null && lesson.priceOverrideCurrency !== null) {
        amount = lesson.priceOverrideAmount;
        currency = lesson.priceOverrideCurrency as Currency;
      } else {
        const [student] = await this.db
          .select()
          .from(students)
          .where(and(eq(students.id, lesson.studentId), eq(students.userId, userId)))
          .limit(1);
        if (!student) throw new NotFoundException('Student not found');
        amount = Math.round((student.hourlyRateAmount * lesson.durationMin) / 60);
        currency = student.hourlyRateCurrency as Currency;
      }
    }

    await this.transactions.upsertForLesson({
      userId,
      lessonId: lesson.id,
      studentId: lesson.studentId,
      amount,
      currency,
      occurredAt: lesson.startsAt,
      description: lesson.notes ?? undefined,
    });
  }

  async plannedIncomeRaw(
    userId: string,
    from: Date,
    to: Date,
  ): Promise<{ amount: number; currency: Currency }[]> {
    const rows = await this.db
      .select({
        priceOverrideAmount: lessons.priceOverrideAmount,
        priceOverrideCurrency: lessons.priceOverrideCurrency,
        durationMin: lessons.durationMin,
        studentHourlyRateAmount: students.hourlyRateAmount,
        studentHourlyRateCurrency: students.hourlyRateCurrency,
      })
      .from(lessons)
      .leftJoin(students, eq(lessons.studentId, students.id))
      .where(
        and(
          eq(lessons.userId, userId),
          gte(lessons.startsAt, from),
          lte(lessons.startsAt, to),
          not(inArray(lessons.status, ['cancelled', 'no_show'])),
        ),
      );

    return rows
      .map((r) => {
        if (r.priceOverrideAmount !== null && r.priceOverrideCurrency !== null) {
          return { amount: r.priceOverrideAmount, currency: r.priceOverrideCurrency as Currency };
        } else if (r.studentHourlyRateAmount !== null && r.studentHourlyRateCurrency !== null) {
          return {
            amount: Math.round((r.studentHourlyRateAmount * r.durationMin) / 60),
            currency: r.studentHourlyRateCurrency as Currency,
          };
        }
        return null;
      })
      .filter((x): x is { amount: number; currency: Currency } => x !== null);
  }
}
