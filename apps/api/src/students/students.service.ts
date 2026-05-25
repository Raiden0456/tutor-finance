import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { and, asc, desc, eq, gte, inArray, isNull, lte, sql } from 'drizzle-orm';
import type { Currency, PricingMode, StudentLessonPackage } from '@tutor-finance/shared';
import { RedisCacheService } from '../cache/redis-cache.service.js';
import { env } from '../config.js';
import { DB } from '../db/db.module.js';
import type { Database } from '../db/client.js';
import { lessons, studentLessonPackages, students } from '../db/schema.js';
import { TransactionsService } from '../transactions/transactions.service.js';
import type {
  CloseStudentPackageDto,
  CreateStudentDto,
  LessonPackageDto,
  StudentResponse,
  UpdateStudentDto,
  UpdateStudentPackagePaymentDto,
} from './students.dto.js';

type Row = typeof students.$inferSelect;
type PackageRow = typeof studentLessonPackages.$inferSelect;

const CONDUCTED_STATUSES = ['completed', 'due', 'paid', 'partially_paid'];

function cleanOptional(value: string | undefined): string | null {
  return value?.trim() || null;
}

function toPackageResponse(r: PackageRow, completedLessons: number): StudentLessonPackage {
  const coveredLessons = r.closedPaidLessons ?? Math.min(completedLessons, r.lessonCount);
  const paymentStatus =
    r.paidAmount <= 0 ? 'unpaid' : r.paidAmount >= r.priceAmount ? 'paid' : 'partially_paid';

  return {
    id: r.id,
    lessonCount: r.lessonCount,
    price: { amount: r.priceAmount, currency: r.priceCurrency as Currency },
    paidAmount: r.paidAmount,
    paymentStatus,
    completedLessons,
    coveredLessons,
    remainingLessons: Math.max(r.lessonCount - coveredLessons, 0),
    overageLessons: Math.max(completedLessons - r.lessonCount, 0),
    closedAt: r.closedAt?.toISOString() ?? null,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
  };
}

@Injectable()
export class StudentsService {
  constructor(
    @Inject(DB) private readonly db: Database,
    private readonly transactions: TransactionsService,
    private readonly cacheService: RedisCacheService,
  ) {}

  async list(userId: string, includeArchived = false): Promise<StudentResponse[]> {
    const cacheKey = `user:${userId}:students:list:${includeArchived ? 'all' : 'active'}`;
    const cached = await this.cacheService.getJson<StudentResponse[]>(cacheKey);
    if (cached) return cached;

    const where = includeArchived
      ? eq(students.userId, userId)
      : and(eq(students.userId, userId), isNull(students.archivedAt));
    const rows = await this.db.select().from(students).where(where).orderBy(asc(students.name));
    const response = await Promise.all(rows.map((row) => this.toResponse(userId, row)));
    await this.cacheService.setJson(cacheKey, response, env.cache.dataTtlSeconds);
    return response;
  }

  async findById(userId: string, id: string): Promise<StudentResponse> {
    const cacheKey = `user:${userId}:students:${id}`;
    const cached = await this.cacheService.getJson<StudentResponse>(cacheKey);
    if (cached) return cached;

    const row = await this.findRowById(userId, id);
    const response = await this.toResponse(userId, row);
    await this.cacheService.setJson(cacheKey, response, env.cache.dataTtlSeconds);
    return response;
  }

  async create(userId: string, input: CreateStudentDto): Promise<StudentResponse> {
    const pricingMode = input.pricingMode ?? 'hourly';
    if (pricingMode === 'hourly' && !input.hourlyRate) {
      throw new BadRequestException('hourlyRate is required for hourly pricing');
    }
    if (pricingMode === 'package' && !input.lessonPackage) {
      throw new BadRequestException('package is required for package pricing');
    }
    if (input.lessonPackage) this.assertPackageInput(input.lessonPackage);

    const hourlyRate = input.hourlyRate ?? {
      amount: 0,
      currency: input.lessonPackage?.price.currency ?? input.defaultCurrency,
    };

    let inserted: Row | undefined;
    await this.db.transaction(async (tx) => {
      const [row] = await tx
        .insert(students)
        .values({
          userId,
          name: input.name,
          email: cleanOptional(input.email),
          phone: cleanOptional(input.phone),
          hourlyRateAmount: hourlyRate.amount,
          hourlyRateCurrency: hourlyRate.currency,
          ratePeriodMin: input.ratePeriodMin ?? 60,
          pricingMode,
          defaultCurrency: input.defaultCurrency,
          meetingLink: cleanOptional(input.meetingLink),
          telegramLink: cleanOptional(input.telegramLink),
          whatsappLink: cleanOptional(input.whatsappLink),
          notes: cleanOptional(input.notes),
        })
        .returning();

      if (!row) throw new NotFoundException('Insert failed');
      inserted = row;

      if (input.lessonPackage) {
        await tx.insert(studentLessonPackages).values({
          userId,
          studentId: row.id,
          lessonCount: input.lessonPackage.lessonCount,
          priceAmount: input.lessonPackage.price.amount,
          priceCurrency: input.lessonPackage.price.currency,
        });
      }
    });

    await this.invalidateUserCache(userId);
    return this.toResponse(userId, inserted!);
  }

  async update(userId: string, id: string, patch: UpdateStudentDto): Promise<StudentResponse> {
    if (Object.keys(patch).length === 0) {
      throw new BadRequestException('PATCH body must not be empty');
    }

    if (patch.lessonPackage) this.assertPackageInput(patch.lessonPackage);

    const set: Partial<typeof students.$inferInsert> = {};
    if (patch.name !== undefined) set.name = patch.name;
    if (patch.email !== undefined) set.email = cleanOptional(patch.email);
    if (patch.phone !== undefined) set.phone = cleanOptional(patch.phone);
    if (patch.hourlyRate !== undefined) {
      set.hourlyRateAmount = patch.hourlyRate.amount;
      set.hourlyRateCurrency = patch.hourlyRate.currency;
    }
    if (patch.ratePeriodMin !== undefined) set.ratePeriodMin = patch.ratePeriodMin;
    if (patch.pricingMode !== undefined) set.pricingMode = patch.pricingMode;
    if (patch.defaultCurrency !== undefined) set.defaultCurrency = patch.defaultCurrency;
    if (patch.meetingLink !== undefined) set.meetingLink = cleanOptional(patch.meetingLink);
    if (patch.telegramLink !== undefined) set.telegramLink = cleanOptional(patch.telegramLink);
    if (patch.whatsappLink !== undefined) set.whatsappLink = cleanOptional(patch.whatsappLink);
    if (patch.notes !== undefined) set.notes = cleanOptional(patch.notes);

    let row = await this.findRowById(userId, id);

    if (Object.keys(set).length > 0) {
      const [updated] = await this.db
        .update(students)
        .set(set)
        .where(and(eq(students.id, id), eq(students.userId, userId)))
        .returning();
      if (!updated) throw new NotFoundException('Student not found');
      row = updated;
    }

    if (patch.lessonPackage !== undefined) {
      await this.upsertActivePackage(userId, id, patch.lessonPackage);
    } else if (patch.pricingMode === 'package') {
      const activePackage = await this.findActivePackageRow(userId, id);
      if (!activePackage) {
        throw new BadRequestException('package is required when switching to package pricing');
      }
    }

    await this.invalidateUserCache(userId);
    return this.toResponse(userId, row);
  }

  async updatePackagePayment(
    userId: string,
    id: string,
    input: UpdateStudentPackagePaymentDto,
  ): Promise<StudentResponse> {
    await this.findRowById(userId, id);

    const activePackage = await this.findActivePackageRow(userId, id);
    if (!activePackage) throw new NotFoundException('Active package not found');
    if (input.paidAmount > activePackage.priceAmount) {
      throw new BadRequestException('paidAmount cannot exceed package price');
    }

    const [updatedPackage] = await this.db
      .update(studentLessonPackages)
      .set({ paidAmount: input.paidAmount, paidAt: input.paidAmount > 0 ? new Date() : null })
      .where(
        and(
          eq(studentLessonPackages.id, activePackage.id),
          eq(studentLessonPackages.userId, userId),
        ),
      )
      .returning();

    if (!updatedPackage) throw new NotFoundException('Active package not found');

    if (input.paidAmount > 0) {
      await this.transactions.upsertForPackage({
        userId,
        studentId: id,
        packageId: activePackage.id,
        amount: input.paidAmount,
        currency: activePackage.priceCurrency,
        occurredAt: new Date(),
        description: 'Lesson package',
      });
    } else {
      await this.transactions.deleteForPackage(userId, activePackage.id);
    }

    await this.invalidateUserCache(userId);
    return this.findById(userId, id);
  }

  async closePackage(userId: string, id: string, input: CloseStudentPackageDto) {
    await this.findRowById(userId, id);

    const activePackage = await this.findActivePackageRow(userId, id);
    if (!activePackage) throw new NotFoundException('Active package not found');
    if (input.coveredLessons > activePackage.lessonCount) {
      throw new BadRequestException('coveredLessons cannot exceed package lesson count');
    }

    await this.db
      .update(studentLessonPackages)
      .set({ closedAt: new Date(), closedPaidLessons: input.coveredLessons })
      .where(
        and(
          eq(studentLessonPackages.id, activePackage.id),
          eq(studentLessonPackages.userId, userId),
        ),
      );

    await this.invalidateUserCache(userId);
    return this.findById(userId, id);
  }

  async archive(userId: string, id: string): Promise<StudentResponse> {
    const [row] = await this.db
      .update(students)
      .set({ archivedAt: new Date() })
      .where(and(eq(students.id, id), eq(students.userId, userId)))
      .returning();
    if (!row) throw new NotFoundException('Student not found');
    await this.invalidateUserCache(userId);
    return this.toResponse(userId, row);
  }

  async unarchive(userId: string, id: string): Promise<StudentResponse> {
    const [row] = await this.db
      .update(students)
      .set({ archivedAt: null })
      .where(and(eq(students.id, id), eq(students.userId, userId)))
      .returning();
    if (!row) throw new NotFoundException('Student not found');
    await this.invalidateUserCache(userId);
    return this.toResponse(userId, row);
  }

  private async findRowById(userId: string, id: string): Promise<Row> {
    const [row] = await this.db
      .select()
      .from(students)
      .where(and(eq(students.id, id), eq(students.userId, userId)))
      .limit(1);
    if (!row) throw new NotFoundException('Student not found');
    return row;
  }

  private async toResponse(userId: string, r: Row): Promise<StudentResponse> {
    const activePackage = await this.getActivePackageResponse(userId, r.id);

    return {
      id: r.id,
      name: r.name,
      email: r.email,
      phone: r.phone,
      hourlyRate: { amount: r.hourlyRateAmount, currency: r.hourlyRateCurrency as Currency },
      ratePeriodMin: r.ratePeriodMin,
      pricingMode: r.pricingMode as PricingMode,
      activePackage,
      defaultCurrency: r.defaultCurrency as Currency,
      meetingLink: r.meetingLink,
      telegramLink: r.telegramLink,
      whatsappLink: r.whatsappLink,
      notes: r.notes,
      archivedAt: r.archivedAt,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
    };
  }

  private async getActivePackageResponse(
    userId: string,
    studentId: string,
  ): Promise<StudentLessonPackage | null> {
    const activePackage = await this.findActivePackageRow(userId, studentId);
    if (!activePackage) return null;
    const completedLessons = await this.countConductedLessons(
      userId,
      studentId,
      activePackage.createdAt,
      activePackage.closedAt ?? undefined,
    );
    return toPackageResponse(activePackage, completedLessons);
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

  private assertPackageInput(input: LessonPackageDto): void {
    if (input.price.amount <= 0) {
      throw new BadRequestException('package.price.amount must be greater than 0');
    }
  }

  private async upsertActivePackage(
    userId: string,
    studentId: string,
    input: LessonPackageDto,
  ): Promise<void> {
    const activePackage = await this.findActivePackageRow(userId, studentId);

    if (activePackage) {
      const completedLessons = await this.countConductedLessons(
        userId,
        studentId,
        activePackage.createdAt,
      );

      if (completedLessons < activePackage.lessonCount) {
        const paidAmount = Math.min(activePackage.paidAmount, input.price.amount);
        await this.db
          .update(studentLessonPackages)
          .set({
            lessonCount: input.lessonCount,
            priceAmount: input.price.amount,
            priceCurrency: input.price.currency,
            paidAmount,
          })
          .where(
            and(
              eq(studentLessonPackages.id, activePackage.id),
              eq(studentLessonPackages.userId, userId),
            ),
          );

        if (paidAmount > 0) {
          await this.transactions.upsertForPackage({
            userId,
            studentId,
            packageId: activePackage.id,
            amount: paidAmount,
            currency: input.price.currency,
            description: 'Lesson package',
          });
        } else {
          await this.transactions.deleteForPackage(userId, activePackage.id);
        }
        return;
      }

      await this.db
        .update(studentLessonPackages)
        .set({
          closedAt: new Date(),
          closedPaidLessons: Math.min(completedLessons, activePackage.lessonCount),
        })
        .where(
          and(
            eq(studentLessonPackages.id, activePackage.id),
            eq(studentLessonPackages.userId, userId),
          ),
        );
    }

    await this.db.insert(studentLessonPackages).values({
      userId,
      studentId,
      lessonCount: input.lessonCount,
      priceAmount: input.price.amount,
      priceCurrency: input.price.currency,
    });
  }

  private async invalidateUserCache(userId: string): Promise<void> {
    await Promise.all([
      this.cacheService.deleteByPrefix(`user:${userId}:students:`),
      this.cacheService.deleteByPrefix(`user:${userId}:lessons:`),
      this.cacheService.deleteByPrefix(`user:${userId}:dashboard:`),
      this.cacheService.deleteByPrefix(`user:${userId}:transactions:`),
    ]);
  }
}
