import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { UserSettings, UserSettingsDocument } from './settings.schema.js';
import type { UserSettingsPatch } from './settings.types.js';

@Injectable()
export class SettingsService {
  constructor(@InjectModel(UserSettings.name) private readonly model: Model<UserSettings>) {}

  async getOrCreate(userId: string): Promise<UserSettingsDocument> {
    const oid = new Types.ObjectId(userId);
    const existing = await this.model.findOne({ userId: oid });
    if (existing) return existing;
    return this.model.create({ userId: oid });
  }

  async update(userId: string, patch: UserSettingsPatch): Promise<UserSettingsDocument> {
    const oid = new Types.ObjectId(userId);
    const $set: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(patch)) {
      if (v !== undefined && v !== null) $set[k] = v;
    }
    const doc = await this.model.findOneAndUpdate(
      { userId: oid },
      { $set, $setOnInsert: { userId: oid } },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );
    return doc as UserSettingsDocument;
  }
}
