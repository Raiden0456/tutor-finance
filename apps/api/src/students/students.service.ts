import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Student, StudentDocument } from './student.schema.js';
import type { StudentInput, StudentPatch } from './student.types.js';

@Injectable()
export class StudentsService {
  constructor(@InjectModel(Student.name) private readonly model: Model<Student>) {}

  list(userId: string, includeArchived = false) {
    const filter: Record<string, unknown> = { userId: new Types.ObjectId(userId) };
    if (!includeArchived) filter.archivedAt = { $exists: false };
    return this.model.find(filter).sort({ name: 1 }).lean();
  }

  async findById(userId: string, id: string): Promise<StudentDocument> {
    const doc = await this.model.findOne({ _id: id, userId: new Types.ObjectId(userId) });
    if (!doc) throw new NotFoundException('Student not found');
    return doc;
  }

  async create(userId: string, input: StudentInput) {
    const doc = await this.model.create({
      ...input,
      userId: new Types.ObjectId(userId),
    });
    return doc;
  }

  async update(userId: string, id: string, patch: StudentPatch) {
    const doc = await this.model.findOneAndUpdate(
      { _id: id, userId: new Types.ObjectId(userId) },
      { $set: patch },
      { new: true },
    );
    if (!doc) throw new NotFoundException('Student not found');
    return doc;
  }

  async archive(userId: string, id: string) {
    const doc = await this.model.findOneAndUpdate(
      { _id: id, userId: new Types.ObjectId(userId) },
      { $set: { archivedAt: new Date() } },
      { new: true },
    );
    if (!doc) throw new NotFoundException('Student not found');
    return doc;
  }

  async unarchive(userId: string, id: string) {
    const doc = await this.model.findOneAndUpdate(
      { _id: id, userId: new Types.ObjectId(userId) },
      { $unset: { archivedAt: '' } },
      { new: true },
    );
    if (!doc) throw new NotFoundException('Student not found');
    return doc;
  }
}
