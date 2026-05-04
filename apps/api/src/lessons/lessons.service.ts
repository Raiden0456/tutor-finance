import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Lesson, LessonDocument } from './lesson.schema.js';
import type { LessonGqlInput, LessonPatch, LessonFilter } from './lesson.types.js';
import { StudentsService } from '../students/students.service.js';
import { TransactionsService } from '../transactions/transactions.service.js';
import type { Currency } from '@tutor-finance/shared';

@Injectable()
export class LessonsService {
  constructor(
    @InjectModel(Lesson.name) private readonly model: Model<Lesson>,
    private readonly students: StudentsService,
    private readonly transactions: TransactionsService,
  ) {}

  list(userId: string, filter: LessonFilter | undefined) {
    const q: Record<string, unknown> = { userId: new Types.ObjectId(userId) };
    if (filter?.studentId) q.studentId = new Types.ObjectId(filter.studentId);
    if (filter?.status) q.status = filter.status;
    if (filter?.from || filter?.to) {
      const range: Record<string, Date> = {};
      if (filter.from) range.$gte = filter.from;
      if (filter.to) range.$lte = filter.to;
      q.startsAt = range;
    }
    const limit = Math.min(filter?.limit ?? 200, 1000);
    return this.model.find(q).sort({ startsAt: -1 }).limit(limit).lean();
  }

  async findById(userId: string, id: string): Promise<LessonDocument> {
    const doc = await this.model.findOne({ _id: id, userId: new Types.ObjectId(userId) });
    if (!doc) throw new NotFoundException('Lesson not found');
    return doc;
  }

  async create(userId: string, input: LessonGqlInput) {
    const doc = await this.model.create({
      userId: new Types.ObjectId(userId),
      studentId: new Types.ObjectId(input.studentId),
      startsAt: input.startsAt,
      durationMin: input.durationMin,
      status: input.status,
      priceOverride: input.priceOverride,
      notes: input.notes,
    });
    if (doc.status === 'completed') {
      await this.syncTransaction(userId, doc);
    }
    return doc;
  }

  async update(userId: string, id: string, patch: LessonPatch) {
    const before = await this.findById(userId, id);
    const $set: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(patch)) {
      if (v !== undefined) $set[k] = v;
    }
    const doc = await this.model.findOneAndUpdate(
      { _id: id, userId: new Types.ObjectId(userId) },
      { $set },
      { new: true },
    );
    if (!doc) throw new NotFoundException('Lesson not found');

    const wasCompleted = before.status === 'completed';
    const isCompleted = doc.status === 'completed';
    if (isCompleted) {
      await this.syncTransaction(userId, doc);
    } else if (wasCompleted) {
      await this.transactions.deleteForLesson(userId, doc.id);
    }
    return doc;
  }

  async remove(userId: string, id: string) {
    const doc = await this.findById(userId, id);
    await this.model.deleteOne({ _id: id, userId: new Types.ObjectId(userId) });
    if (doc.status === 'completed') {
      await this.transactions.deleteForLesson(userId, doc.id);
    }
    return true;
  }

  private async syncTransaction(userId: string, lesson: LessonDocument) {
    let amount: number;
    let currency: Currency;
    if (lesson.priceOverride) {
      amount = lesson.priceOverride.amount;
      currency = lesson.priceOverride.currency;
    } else {
      const student = await this.students.findById(userId, lesson.studentId.toHexString());
      const hourly = student.hourlyRate;
      amount = Math.round((hourly.amount * lesson.durationMin) / 60);
      currency = hourly.currency;
    }
    await this.transactions.upsertForLesson({
      userId,
      lessonId: lesson.id,
      studentId: lesson.studentId.toHexString(),
      amount,
      currency,
      occurredAt: lesson.startsAt,
      description: lesson.notes ?? undefined,
    });
  }
}
