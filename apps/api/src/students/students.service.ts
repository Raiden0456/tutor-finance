import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { and, asc, eq, isNull } from 'drizzle-orm';
import type { Currency } from '@tutor-finance/shared';
import { DB } from '../db/db.module.js';
import type { Database } from '../db/client.js';
import { students } from '../db/schema.js';
import type { CreateStudentDto, StudentResponse, UpdateStudentDto } from './students.dto.js';

type Row = typeof students.$inferSelect;

function toResponse(r: Row): StudentResponse {
  return {
    id: r.id,
    name: r.name,
    email: r.email,
    phone: r.phone,
    hourlyRate: { amount: r.hourlyRateAmount, currency: r.hourlyRateCurrency as Currency },
    defaultCurrency: r.defaultCurrency as Currency,
    notes: r.notes,
    archivedAt: r.archivedAt,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
  };
}

@Injectable()
export class StudentsService {
  constructor(@Inject(DB) private readonly db: Database) {}

  async list(userId: string, includeArchived = false): Promise<StudentResponse[]> {
    const where = includeArchived
      ? eq(students.userId, userId)
      : and(eq(students.userId, userId), isNull(students.archivedAt));
    const rows = await this.db.select().from(students).where(where).orderBy(asc(students.name));
    return rows.map(toResponse);
  }

  async findById(userId: string, id: string): Promise<StudentResponse> {
    const [row] = await this.db
      .select()
      .from(students)
      .where(and(eq(students.id, id), eq(students.userId, userId)))
      .limit(1);
    if (!row) throw new NotFoundException('Student not found');
    return toResponse(row);
  }

  async create(userId: string, input: CreateStudentDto): Promise<StudentResponse> {
    const inserted = await this.db
      .insert(students)
      .values({
        userId,
        name: input.name,
        email: input.email ?? null,
        phone: input.phone ?? null,
        hourlyRateAmount: input.hourlyRate.amount,
        hourlyRateCurrency: input.hourlyRate.currency,
        defaultCurrency: input.defaultCurrency,
        notes: input.notes ?? null,
      })
      .returning();
    return toResponse(inserted[0]!);
  }

  async update(userId: string, id: string, patch: UpdateStudentDto): Promise<StudentResponse> {
    const set: Partial<typeof students.$inferInsert> = {};
    if (patch.name !== undefined) set.name = patch.name;
    if (patch.email !== undefined) set.email = patch.email || null;
    if (patch.phone !== undefined) set.phone = patch.phone || null;
    if (patch.hourlyRate !== undefined) {
      set.hourlyRateAmount = patch.hourlyRate.amount;
      set.hourlyRateCurrency = patch.hourlyRate.currency;
    }
    if (patch.defaultCurrency !== undefined) set.defaultCurrency = patch.defaultCurrency;
    if (patch.notes !== undefined) set.notes = patch.notes || null;

    const [row] = await this.db
      .update(students)
      .set(set)
      .where(and(eq(students.id, id), eq(students.userId, userId)))
      .returning();
    if (!row) throw new NotFoundException('Student not found');
    return toResponse(row);
  }

  async archive(userId: string, id: string): Promise<StudentResponse> {
    const [row] = await this.db
      .update(students)
      .set({ archivedAt: new Date() })
      .where(and(eq(students.id, id), eq(students.userId, userId)))
      .returning();
    if (!row) throw new NotFoundException('Student not found');
    return toResponse(row);
  }

  async unarchive(userId: string, id: string): Promise<StudentResponse> {
    const [row] = await this.db
      .update(students)
      .set({ archivedAt: null })
      .where(and(eq(students.id, id), eq(students.userId, userId)))
      .returning();
    if (!row) throw new NotFoundException('Student not found');
    return toResponse(row);
  }
}
