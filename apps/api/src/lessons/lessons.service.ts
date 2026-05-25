import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import {
  and,
  asc,
  desc,
  eq,
  gte,
  inArray,
  isNotNull,
  isNull,
  lt,
  lte,
  not,
  sql,
  type SQL,
} from 'drizzle-orm';
import type { Currency, LessonStatus } from '@tutor-finance/shared';
import { RedisCacheService } from '../cache/redis-cache.service.js';
import { env } from '../config.js';
import { DB } from '../db/db.module.js';
import type { Database } from '../db/client.js';
import { lessons, studentLessonPackages, students } from '../db/schema.js';
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
  recurringLessonId: lessons.recurringLessonId,
  startsAt: lessons.startsAt,
  durationMin: lessons.durationMin,
  status: lessons.status,
  priceOverrideAmount: lessons.priceOverrideAmount,
  priceOverrideCurrency: lessons.priceOverrideCurrency,
  paidAmount: lessons.paidAmount,
  notes: lessons.notes,
  homework: lessons.homework,
  meetingLink: lessons.meetingLink,
  archivedAt: lessons.archivedAt,
  createdAt: lessons.createdAt,
  updatedAt: lessons.updatedAt,
  studentHourlyRateAmount: students.hourlyRateAmount,
  studentHourlyRateCurrency: students.hourlyRateCurrency,
  studentRatePeriodMin: students.ratePeriodMin,
  studentPricingMode: students.pricingMode,
};

type JoinRow = {
  id: string;
  userId: string;
  studentId: string;
  recurringLessonId: string | null;
  startsAt: Date;
  durationMin: number;
  status: string;
  priceOverrideAmount: number | null;
  priceOverrideCurrency: string | null;
  paidAmount: number | null;
  notes: string | null;
  homework: string | null;
  meetingLink: string | null;
  archivedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  studentHourlyRateAmount: number | null;
  studentHourlyRateCurrency: string | null;
  studentRatePeriodMin: number | null;
  studentPricingMode: string | null;
};

type EffectivePrice = { amount: number; currency: Currency };
type PriceResolution = { price: EffectivePrice; source: 'override' | 'package' | 'hourly' };

type PackageRow = typeof studentLessonPackages.$inferSelect;

function toLessonResponse(r: JoinRow, resolution: PriceResolution | null): LessonResponse {
  return {
    id: r.id,
    studentId: r.studentId,
    recurringLessonId: r.recurringLessonId,
    startsAt: r.startsAt,
    durationMin: r.durationMin,
    status: r.status as LessonStatus,
    priceOverride:
      r.priceOverrideAmount !== null && r.priceOverrideCurrency !== null
        ? { amount: r.priceOverrideAmount, currency: r.priceOverrideCurrency as Currency }
        : null,
    paidAmount: r.paidAmount ?? null,
    effectivePrice: resolution?.price ?? null,
    isPackageCovered: resolution?.source === 'package',
    notes: r.notes,
    homework: r.homework,
    meetingLink: r.meetingLink,
    archivedAt: r.archivedAt,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
  };
}

const PAYMENT_STATUSES = ['paid', 'partially_paid'];
const CONDUCTED_STATUSES = ['completed', 'due', 'paid', 'partially_paid'];

function isConductedStatus(status: string): boolean {
  return CONDUCTED_STATUSES.includes(status);
}

function packageUnitPrice(pkg: PackageRow, lessonNumber?: number): EffectivePrice {
  const baseAmount = Math.floor(pkg.priceAmount / pkg.lessonCount);
  const remainder = pkg.priceAmount - baseAmount * pkg.lessonCount;
  const remainderShare = lessonNumber !== undefined && lessonNumber <= remainder ? 1 : 0;

  return {
    amount: baseAmount + remainderShare,
    currency: pkg.priceCurrency as Currency,
  };
}

function hourlyPrice(amount: number, currency: string, durationMin: number, ratePeriodMin: number) {
  return {
    amount: Math.round((amount * durationMin) / ratePeriodMin),
    currency: currency as Currency,
  };
}

@Injectable()
export class LessonsService {
  constructor(
    @Inject(DB) private readonly db: Database,
    private readonly transactions: TransactionsService,
    private readonly cacheService: RedisCacheService,
  ) {}

  async list(userId: string, filter: LessonFilterDto | undefined): Promise<LessonResponse[]> {
    await this.autoCompleteStale(userId);

    const cacheKey = `user:${userId}:lessons:list:${JSON.stringify(filter ?? {})}`;
    const cached = await this.cacheService.getJson<LessonResponse[]>(cacheKey);
    if (cached) return cached;

    const conds: SQL[] = [eq(lessons.userId, userId)];

    if (filter?.showArchived) {
      conds.push(isNotNull(lessons.archivedAt));
    } else {
      conds.push(isNull(lessons.archivedAt));
    }

    if (filter?.studentId) conds.push(eq(lessons.studentId, filter.studentId));
    if (filter?.status) conds.push(eq(lessons.status, filter.status));
    if (filter?.from) conds.push(gte(lessons.startsAt, new Date(filter.from)));
    if (filter?.to) conds.push(lte(lessons.startsAt, new Date(filter.to)));

    const limit = Math.min(filter?.limit ?? 200, 1000);
    const offset = filter?.offset ?? 0;
    const rows = await this.db
      .select(JOIN_COLS)
      .from(lessons)
      .leftJoin(students, and(eq(lessons.studentId, students.id), eq(students.userId, userId)))
      .where(and(...conds))
      .orderBy(filter?.orderDir === 'asc' ? asc(lessons.startsAt) : desc(lessons.startsAt))
      .offset(offset)
      .limit(limit);
    const response = await Promise.all(rows.map((r) => this.toResponse(r as JoinRow)));
    await this.cacheService.setJson(cacheKey, response, env.cache.dataTtlSeconds);
    return response;
  }

  private async autoCompleteStale(userId: string): Promise<void> {
    const stale = await this.db
      .select()
      .from(lessons)
      .where(
        and(
          eq(lessons.userId, userId),
          eq(lessons.status, 'scheduled'),
          isNull(lessons.archivedAt),
          lt(sql`${lessons.startsAt} + (${lessons.durationMin} * interval '1 minute')`, sql`now()`),
        ),
      );

    for (const row of stale) {
      const resolution = await this.resolveEffectivePriceForStoredLesson(userId, row);
      await this.db
        .update(lessons)
        .set({ status: resolution?.source === 'package' ? 'completed' : 'due' })
        .where(and(eq(lessons.id, row.id), eq(lessons.userId, userId)));
      // no syncTransaction — payment must be explicitly confirmed for non-package lessons
    }

    if (stale.length > 0) {
      await this.invalidateUserCache(userId);
    }
  }

  async findById(userId: string, id: string): Promise<LessonResponse> {
    const cacheKey = `user:${userId}:lessons:${id}`;
    const cached = await this.cacheService.getJson<LessonResponse>(cacheKey);
    if (cached) return cached;

    const row = await this.findJoinRow(userId, id);
    const response = await this.toResponse(row);
    await this.cacheService.setJson(cacheKey, response, env.cache.dataTtlSeconds);
    return response;
  }

  private async findJoinRow(userId: string, id: string): Promise<JoinRow> {
    const [row] = await this.db
      .select(JOIN_COLS)
      .from(lessons)
      .leftJoin(students, and(eq(lessons.studentId, students.id), eq(students.userId, userId)))
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

  private async toResponse(row: JoinRow): Promise<LessonResponse> {
    const resolution = await this.resolveEffectivePriceFromJoin(row);
    if (
      resolution?.source === 'package' &&
      (row.status === 'due' || row.status === 'paid' || row.status === 'partially_paid')
    ) {
      await this.db
        .update(lessons)
        .set({ status: 'completed', paidAmount: null })
        .where(and(eq(lessons.id, row.id), eq(lessons.userId, row.userId)));
      await this.transactions.deleteForLesson(row.userId, row.id);
      await this.invalidateUserCache(row.userId);
      return toLessonResponse({ ...row, status: 'completed', paidAmount: null }, resolution);
    }

    return toLessonResponse(row, resolution);
  }

  private async findStudentOwned(
    userId: string,
    studentId: string,
  ): Promise<typeof students.$inferSelect> {
    const [student] = await this.db
      .select()
      .from(students)
      .where(and(eq(students.id, studentId), eq(students.userId, userId)))
      .limit(1);
    if (!student) throw new NotFoundException('Student not found');
    return student;
  }

  private assertPaymentState(status: string, paidAmount: number | null): void {
    if (status === 'partially_paid' && paidAmount === null) {
      throw new BadRequestException('partially_paid lessons require paidAmount');
    }
  }

  private async resolveEffectivePriceFromJoin(row: JoinRow): Promise<PriceResolution | null> {
    if (row.priceOverrideAmount !== null && row.priceOverrideCurrency !== null) {
      return {
        price: { amount: row.priceOverrideAmount, currency: row.priceOverrideCurrency as Currency },
        source: 'override',
      };
    }

    if (row.studentHourlyRateAmount === null || row.studentHourlyRateCurrency === null) {
      return null;
    }

    return this.resolveStudentPrice({
      userId: row.userId,
      studentId: row.studentId,
      startsAt: row.startsAt,
      durationMin: row.durationMin,
      status: row.status,
      hourlyRateAmount: row.studentHourlyRateAmount,
      hourlyRateCurrency: row.studentHourlyRateCurrency,
      ratePeriodMin: row.studentRatePeriodMin ?? 60,
      pricingMode: row.studentPricingMode ?? 'hourly',
    });
  }

  private async resolveEffectivePriceForStoredLesson(
    userId: string,
    lesson: Row,
  ): Promise<PriceResolution | null> {
    if (lesson.priceOverrideAmount !== null && lesson.priceOverrideCurrency !== null) {
      return {
        price: {
          amount: lesson.priceOverrideAmount,
          currency: lesson.priceOverrideCurrency as Currency,
        },
        source: 'override',
      };
    }

    const student = await this.findStudentOwned(userId, lesson.studentId);
    return this.resolveStudentPrice({
      userId,
      studentId: lesson.studentId,
      startsAt: lesson.startsAt,
      durationMin: lesson.durationMin,
      status: lesson.status,
      hourlyRateAmount: student.hourlyRateAmount,
      hourlyRateCurrency: student.hourlyRateCurrency,
      ratePeriodMin: student.ratePeriodMin,
      pricingMode: student.pricingMode,
    });
  }

  private async resolveStudentPrice(input: {
    userId: string;
    studentId: string;
    startsAt: Date;
    durationMin: number;
    status: string;
    hourlyRateAmount: number;
    hourlyRateCurrency: string;
    ratePeriodMin: number;
    pricingMode: string;
  }): Promise<PriceResolution> {
    const activePackage = await this.findActivePackageRow(input.userId, input.studentId);

    if (activePackage) {
      const packageCoverage = await this.getPackageCoverage(
        input.userId,
        input.studentId,
        activePackage,
        input.startsAt,
        input.status,
      );

      if (packageCoverage.covered || input.pricingMode === 'package') {
        return {
          price: packageUnitPrice(activePackage, packageCoverage.lessonNumber),
          source: 'package',
        };
      }
    }

    return {
      price: hourlyPrice(
        input.hourlyRateAmount,
        input.hourlyRateCurrency,
        input.durationMin,
        input.ratePeriodMin,
      ),
      source: 'hourly',
    };
  }

  private async findActivePackageRow(
    userId: string,
    studentId: string,
  ): Promise<PackageRow | null> {
    const [row] = await this.db
      .select()
      .from(studentLessonPackages)
      .where(
        and(
          eq(studentLessonPackages.userId, userId),
          eq(studentLessonPackages.studentId, studentId),
          isNull(studentLessonPackages.closedAt),
        ),
      )
      .orderBy(desc(studentLessonPackages.createdAt))
      .limit(1);
    return row ?? null;
  }

  private async getPackageCoverage(
    userId: string,
    studentId: string,
    pkg: PackageRow,
    startsAt: Date,
    status: string,
  ): Promise<{ covered: boolean; lessonNumber: number | undefined }> {
    if (startsAt < pkg.createdAt) return { covered: false, lessonNumber: undefined };

    const conducted = isConductedStatus(status);
    const countedUntil = conducted ? startsAt : undefined;
    const conductedCount = await this.countConductedLessons(
      userId,
      studentId,
      pkg.createdAt,
      countedUntil,
    );
    const lessonNumber = conducted ? conductedCount : conductedCount + 1;

    return {
      covered: lessonNumber <= pkg.lessonCount,
      lessonNumber,
    };
  }

  private async countConductedLessons(
    userId: string,
    studentId: string,
    from: Date,
    to?: Date,
  ): Promise<number> {
    const conds = [
      eq(lessons.userId, userId),
      eq(lessons.studentId, studentId),
      inArray(lessons.status, CONDUCTED_STATUSES),
      gte(lessons.startsAt, from),
    ];
    if (to) conds.push(lte(lessons.startsAt, to));

    const [row] = await this.db
      .select({ count: sql<number>`count(*)::int` })
      .from(lessons)
      .where(and(...conds));

    return Number(row?.count ?? 0);
  }

  async create(userId: string, input: CreateLessonDto): Promise<LessonResponse> {
    const student = await this.findStudentOwned(userId, input.studentId);
    this.assertPaymentState(input.status, input.paidAmount ?? null);

    const [row] = await this.db
      .insert(lessons)
      .values({
        userId,
        studentId: input.studentId,
        startsAt: new Date(input.startsAt),
        durationMin: input.durationMin,
        status: input.status,
        paidAmount: input.paidAmount ?? null,
        priceOverrideAmount: input.priceOverride?.amount ?? null,
        priceOverrideCurrency: input.priceOverride?.currency ?? null,
        notes: input.notes ?? null,
        homework: input.homework ?? null,
        meetingLink: input.meetingLink ?? student.meetingLink ?? null,
      })
      .returning();
    if (!row) throw new NotFoundException('Insert failed');
    if (PAYMENT_STATUSES.includes(row.status)) {
      await this.syncTransaction(userId, row, true);
    }
    await this.invalidateDashboard(userId);
    return this.findById(userId, row.id);
  }

  async update(userId: string, id: string, patch: UpdateLessonDto): Promise<LessonResponse> {
    if (Object.keys(patch).length === 0) {
      throw new BadRequestException('PATCH body must not be empty');
    }

    const before = await this.findRowById(userId, id);
    const nextStudent =
      patch.studentId !== undefined ? await this.findStudentOwned(userId, patch.studentId) : null;
    this.assertPaymentState(patch.status ?? before.status, patch.paidAmount ?? before.paidAmount);

    const set: Partial<typeof lessons.$inferInsert> = {};
    if (patch.studentId !== undefined) set.studentId = patch.studentId;
    if (patch.startsAt !== undefined) set.startsAt = new Date(patch.startsAt);
    if (patch.durationMin !== undefined) set.durationMin = patch.durationMin;
    if (patch.status !== undefined) set.status = patch.status;
    if (patch.paidAmount !== undefined) set.paidAmount = patch.paidAmount;
    if (patch.priceOverride !== undefined) {
      if (patch.priceOverride === null) {
        set.priceOverrideAmount = null;
        set.priceOverrideCurrency = null;
      } else {
        set.priceOverrideAmount = patch.priceOverride.amount;
        set.priceOverrideCurrency = patch.priceOverride.currency;
      }
    }
    if (patch.notes !== undefined) set.notes = patch.notes || null;
    if (patch.homework !== undefined) set.homework = patch.homework || null;
    if (patch.meetingLink !== undefined) {
      set.meetingLink = patch.meetingLink || null;
    } else if (nextStudent && before.meetingLink === null) {
      set.meetingLink = nextStudent.meetingLink;
    }

    const [row] = await this.db
      .update(lessons)
      .set(set)
      .where(and(eq(lessons.id, id), eq(lessons.userId, userId)))
      .returning();
    if (!row) throw new NotFoundException('Lesson not found');

    const wasPayment = PAYMENT_STATUSES.includes(before.status);
    const isPayment = PAYMENT_STATUSES.includes(row.status);

    if (isPayment) {
      await this.syncTransaction(userId, row, !wasPayment);
    } else if (wasPayment) {
      await this.transactions.deleteForLesson(userId, row.id);
    }
    await this.invalidateDashboard(userId);
    return this.findById(userId, row.id);
  }

  async remove(userId: string, id: string): Promise<boolean> {
    const row = await this.findRowById(userId, id);
    if (PAYMENT_STATUSES.includes(row.status)) {
      await this.transactions.deleteForLesson(userId, id);
    }
    await this.db.delete(lessons).where(and(eq(lessons.id, id), eq(lessons.userId, userId)));
    await this.invalidateDashboard(userId);
    return true;
  }

  async archive(userId: string, id: string): Promise<LessonResponse> {
    const row = await this.findRowById(userId, id);
    const [updated] = await this.db
      .update(lessons)
      .set({ archivedAt: new Date() })
      .where(and(eq(lessons.id, id), eq(lessons.userId, userId)))
      .returning();
    if (!updated) throw new NotFoundException('Lesson not found');
    if (PAYMENT_STATUSES.includes(row.status)) {
      await this.transactions.deleteForLesson(userId, id);
    }
    await this.invalidateDashboard(userId);
    return this.findById(userId, id);
  }

  async deleteArchive(userId: string): Promise<number> {
    const archived = await this.db
      .select({ id: lessons.id, status: lessons.status })
      .from(lessons)
      .where(and(eq(lessons.userId, userId), isNotNull(lessons.archivedAt)));

    for (const row of archived) {
      if (PAYMENT_STATUSES.includes(row.status)) {
        await this.transactions.deleteForLesson(userId, row.id);
      }
    }

    await this.db
      .delete(lessons)
      .where(and(eq(lessons.userId, userId), isNotNull(lessons.archivedAt)));

    await this.invalidateDashboard(userId);
    return archived.length;
  }

  private async syncTransaction(userId: string, lesson: Row, updateOccurredAt: boolean) {
    const occurredAt = updateOccurredAt ? new Date() : undefined;
    const resolution = await this.resolveEffectivePriceForStoredLesson(userId, lesson);
    if (!resolution) throw new NotFoundException('Student not found');

    if (resolution.source === 'package') {
      await this.transactions.deleteForLesson(userId, lesson.id);
      return;
    }

    const amount =
      lesson.status === 'partially_paid' && lesson.paidAmount !== null
        ? lesson.paidAmount
        : resolution.price.amount;
    const currency = resolution.price.currency;

    await this.transactions.upsertForLesson({
      userId,
      lessonId: lesson.id,
      studentId: lesson.studentId,
      amount,
      currency,
      occurredAt,
      description: lesson.notes ?? undefined,
    });
  }

  async plannedIncomeRaw(
    userId: string,
    from: Date,
    to: Date,
  ): Promise<{ amount: number; currency: Currency }[]> {
    const rows = await this.plannedIncomeRows(userId, from, to);

    const resolved = await Promise.all(rows.map((r) => this.resolvePlannedAmount(userId, r)));
    return resolved.filter((x): x is { amount: number; currency: Currency } => x !== null);
  }

  async plannedIncomeDailyRaw(
    userId: string,
    from: Date,
    to: Date,
  ): Promise<{ date: string; amount: number; currency: Currency }[]> {
    const rows = await this.plannedIncomeRows(userId, from, to);

    const resolved = await Promise.all(
      rows.map(async (r) => {
        const planned = await this.resolvePlannedAmount(userId, r);
        return planned ? { date: r.date, ...planned } : null;
      }),
    );
    return resolved.filter(
      (x): x is { date: string; amount: number; currency: Currency } => x !== null,
    );
  }

  private async plannedIncomeRows(userId: string, from: Date, to: Date) {
    return this.db
      .select({
        date: sql<string>`to_char(${lessons.startsAt}, 'YYYY-MM-DD')`,
        studentId: lessons.studentId,
        startsAt: lessons.startsAt,
        status: lessons.status,
        priceOverrideAmount: lessons.priceOverrideAmount,
        priceOverrideCurrency: lessons.priceOverrideCurrency,
        durationMin: lessons.durationMin,
        studentHourlyRateAmount: students.hourlyRateAmount,
        studentHourlyRateCurrency: students.hourlyRateCurrency,
        studentRatePeriodMin: students.ratePeriodMin,
        studentPricingMode: students.pricingMode,
      })
      .from(lessons)
      .leftJoin(students, and(eq(lessons.studentId, students.id), eq(students.userId, userId)))
      .where(
        and(
          eq(lessons.userId, userId),
          isNull(lessons.archivedAt),
          gte(lessons.startsAt, from),
          lte(lessons.startsAt, to),
          not(inArray(lessons.status, ['cancelled', 'no_show'])),
        ),
      );
  }

  private async resolvePlannedAmount(
    userId: string,
    r: Awaited<ReturnType<typeof this.plannedIncomeRows>>[number],
  ): Promise<EffectivePrice | null> {
    if (r.priceOverrideAmount !== null && r.priceOverrideCurrency !== null) {
      return { amount: r.priceOverrideAmount, currency: r.priceOverrideCurrency as Currency };
    }

    if (r.studentHourlyRateAmount === null || r.studentHourlyRateCurrency === null) return null;

    const resolution = await this.resolveStudentPrice({
      userId,
      studentId: r.studentId,
      startsAt: r.startsAt,
      durationMin: r.durationMin,
      status: r.status,
      hourlyRateAmount: r.studentHourlyRateAmount,
      hourlyRateCurrency: r.studentHourlyRateCurrency,
      ratePeriodMin: r.studentRatePeriodMin ?? 60,
      pricingMode: r.studentPricingMode ?? 'hourly',
    });

    return resolution.source === 'package' ? null : resolution.price;
  }

  private async invalidateDashboard(userId: string): Promise<void> {
    await this.invalidateUserCache(userId);
  }

  private async invalidateUserCache(userId: string): Promise<void> {
    await Promise.all([
      this.cacheService.deleteByPrefix(`user:${userId}:dashboard:`),
      this.cacheService.deleteByPrefix(`user:${userId}:lessons:`),
      this.cacheService.deleteByPrefix(`user:${userId}:students:`),
      this.cacheService.deleteByPrefix(`user:${userId}:transactions:`),
    ]);
  }
}
