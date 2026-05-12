import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { and, asc, desc, eq, gte, lt, lte, sql, type SQL } from 'drizzle-orm';
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

function toResponse(r: Row): LessonResponse {
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
    notes: r.notes,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
  };
}

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
      .select()
      .from(lessons)
      .where(and(...conds))
      .orderBy(filter?.orderDir === 'asc' ? asc(lessons.startsAt) : desc(lessons.startsAt))
      .limit(limit);
    return rows.map(toResponse);
  }

  private async autoCompleteStale(userId: string): Promise<void> {
    // Find scheduled lessons where startsAt + durationMin is in the past
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
        .set({ status: 'completed' })
        .where(and(eq(lessons.id, row.id), eq(lessons.userId, userId)));
      await this.syncTransaction(userId, { ...row, status: 'completed' });
    }
  }

  async findById(userId: string, id: string): Promise<LessonResponse> {
    const row = await this.findRowById(userId, id);
    return toResponse(row);
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
    const inserted = await this.db
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
    const row = inserted[0]!;

    if (row.status === 'completed') {
      await this.syncTransaction(userId, row);
    }
    return toResponse(row);
  }

  async update(userId: string, id: string, patch: UpdateLessonDto): Promise<LessonResponse> {
    const before = await this.findRowById(userId, id);

    const set: Partial<typeof lessons.$inferInsert> = {};
    if (patch.startsAt !== undefined) set.startsAt = new Date(patch.startsAt);
    if (patch.durationMin !== undefined) set.durationMin = patch.durationMin;
    if (patch.status !== undefined) set.status = patch.status;
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

    const wasCompleted = before.status === 'completed';
    const isCompleted = row.status === 'completed';
    if (isCompleted) {
      await this.syncTransaction(userId, row);
    } else if (wasCompleted) {
      await this.transactions.deleteForLesson(userId, row.id);
    }
    return toResponse(row);
  }

  async remove(userId: string, id: string): Promise<boolean> {
    const row = await this.findRowById(userId, id);
    await this.db.delete(lessons).where(and(eq(lessons.id, id), eq(lessons.userId, userId)));
    if (row.status === 'completed') {
      await this.transactions.deleteForLesson(userId, row.id);
    }
    return true;
  }

  private async syncTransaction(userId: string, lesson: Row) {
    let amount: number;
    let currency: Currency;
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
}
