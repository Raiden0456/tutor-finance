import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Transaction } from './transaction.schema.js';
import type { TransactionGqlInput, TransactionPatch, TransactionFilter } from './transaction.types.js';

@Injectable()
export class TransactionsService {
  constructor(@InjectModel(Transaction.name) private readonly model: Model<Transaction>) {}

  list(userId: string, filter: TransactionFilter | undefined) {
    const q: Record<string, unknown> = { userId: new Types.ObjectId(userId) };
    if (filter?.type) q.type = filter.type;
    if (filter?.studentId) q.studentId = new Types.ObjectId(filter.studentId);
    if (filter?.from || filter?.to) {
      const range: Record<string, Date> = {};
      if (filter.from) range.$gte = filter.from;
      if (filter.to) range.$lte = filter.to;
      q.occurredAt = range;
    }
    const limit = Math.min(filter?.limit ?? 200, 1000);
    return this.model.find(q).sort({ occurredAt: -1 }).limit(limit).lean();
  }

  async findById(userId: string, id: string) {
    const doc = await this.model.findOne({ _id: id, userId: new Types.ObjectId(userId) });
    if (!doc) throw new NotFoundException('Transaction not found');
    return doc;
  }

  create(userId: string, input: TransactionGqlInput) {
    const studentId = input.studentId ? new Types.ObjectId(input.studentId) : undefined;
    return this.model.create({
      userId: new Types.ObjectId(userId),
      type: input.type,
      amount: input.amount,
      currency: input.currency,
      occurredAt: input.occurredAt,
      category: input.category,
      studentId,
      description: input.description,
    });
  }

  async update(userId: string, id: string, patch: TransactionPatch) {
    const $set: Record<string, unknown> = { ...patch };
    if (patch.studentId !== undefined) {
      $set.studentId = patch.studentId ? new Types.ObjectId(patch.studentId) : undefined;
    }
    const doc = await this.model.findOneAndUpdate(
      { _id: id, userId: new Types.ObjectId(userId) },
      { $set },
      { new: true },
    );
    if (!doc) throw new NotFoundException('Transaction not found');
    return doc;
  }

  async remove(userId: string, id: string) {
    const res = await this.model.deleteOne({ _id: id, userId: new Types.ObjectId(userId) });
    return res.deletedCount > 0;
  }

  // Internal: used by LessonsService when a lesson transitions to completed.
  async upsertForLesson(args: {
    userId: string;
    lessonId: string;
    studentId: string;
    amount: number;
    currency: string;
    occurredAt: Date;
    description?: string;
  }) {
    return this.model.findOneAndUpdate(
      {
        userId: new Types.ObjectId(args.userId),
        lessonId: new Types.ObjectId(args.lessonId),
      },
      {
        $set: {
          type: 'income',
          amount: args.amount,
          currency: args.currency,
          occurredAt: args.occurredAt,
          category: 'lesson',
          studentId: new Types.ObjectId(args.studentId),
          description: args.description,
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );
  }

  async deleteForLesson(userId: string, lessonId: string) {
    await this.model.deleteOne({
      userId: new Types.ObjectId(userId),
      lessonId: new Types.ObjectId(lessonId),
    });
  }

  async monthSummary(userId: string, from: Date, to: Date) {
    const docs = await this.model.aggregate([
      { $match: { userId: new Types.ObjectId(userId), occurredAt: { $gte: from, $lte: to } } },
      {
        $group: {
          _id: { type: '$type', currency: '$currency' },
          total: { $sum: '$amount' },
          count: { $sum: 1 },
        },
      },
    ]);
    return docs as Array<{
      _id: { type: 'income' | 'expense'; currency: string };
      total: number;
      count: number;
    }>;
  }
}
