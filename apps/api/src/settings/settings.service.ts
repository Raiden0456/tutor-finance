import { Inject, Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import type { Currency, Locale, Theme } from '@tutor-finance/shared';
import { DB } from '../db/db.module.js';
import type { Database } from '../db/client.js';
import { userSettings } from '../db/schema.js';
import type { SettingsResponse, UpdateSettingsDto } from './settings.dto.js';

type Row = typeof userSettings.$inferSelect;

function toResponse(r: Row): SettingsResponse {
  return {
    primaryCurrency: r.primaryCurrency as Currency,
    theme: r.theme as Theme,
    locale: r.locale as Locale,
  };
}

@Injectable()
export class SettingsService {
  constructor(@Inject(DB) private readonly db: Database) {}

  async getOrCreate(userId: string): Promise<SettingsResponse> {
    const [existing] = await this.db
      .select()
      .from(userSettings)
      .where(eq(userSettings.userId, userId))
      .limit(1);
    if (existing) return toResponse(existing);

    const created = await this.db.insert(userSettings).values({ userId }).returning();
    return toResponse(created[0]!);
  }

  async update(userId: string, patch: UpdateSettingsDto): Promise<SettingsResponse> {
    const set: Partial<typeof userSettings.$inferInsert> = {};
    if (patch.primaryCurrency !== undefined) set.primaryCurrency = patch.primaryCurrency;
    if (patch.theme !== undefined) set.theme = patch.theme;
    if (patch.locale !== undefined) set.locale = patch.locale;

    const upserted = await this.db
      .insert(userSettings)
      .values({ userId, ...set })
      .onConflictDoUpdate({ target: userSettings.userId, set })
      .returning();
    return toResponse(upserted[0]!);
  }
}
