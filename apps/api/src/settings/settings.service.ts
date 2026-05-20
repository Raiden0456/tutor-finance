import { Inject, Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import type { Currency, Locale, Theme, WeekStartsOn } from '@tutor-finance/shared';
import { RedisCacheService } from '../cache/redis-cache.service.js';
import { env } from '../config.js';
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
    weekStartsOn: r.weekStartsOn as WeekStartsOn,
  };
}

@Injectable()
export class SettingsService {
  constructor(
    @Inject(DB) private readonly db: Database,
    private readonly cacheService: RedisCacheService,
  ) {}

  async getOrCreate(userId: string): Promise<SettingsResponse> {
    const cacheKey = `user:${userId}:settings:me`;
    const cached = await this.cacheService.getJson<SettingsResponse>(cacheKey);
    if (cached?.weekStartsOn !== undefined) return cached;

    const [existing] = await this.db
      .select()
      .from(userSettings)
      .where(eq(userSettings.userId, userId))
      .limit(1);
    if (existing) {
      const response = toResponse(existing);
      await this.cacheService.setJson(cacheKey, response, env.cache.dataTtlSeconds);
      return response;
    }

    const created = await this.db.insert(userSettings).values({ userId }).returning();
    const response = toResponse(created[0]!);
    await this.cacheService.setJson(cacheKey, response, env.cache.dataTtlSeconds);
    return response;
  }

  async update(userId: string, patch: UpdateSettingsDto): Promise<SettingsResponse> {
    const set: Partial<typeof userSettings.$inferInsert> = {};
    if (patch.primaryCurrency !== undefined) set.primaryCurrency = patch.primaryCurrency;
    if (patch.theme !== undefined) set.theme = patch.theme;
    if (patch.locale !== undefined) set.locale = patch.locale;
    if (patch.weekStartsOn !== undefined) set.weekStartsOn = patch.weekStartsOn;

    const upserted = await this.db
      .insert(userSettings)
      .values({ userId, ...set })
      .onConflictDoUpdate({ target: userSettings.userId, set })
      .returning();
    await Promise.all([
      this.cacheService.del(`user:${userId}:settings:me`),
      this.cacheService.deleteByPrefix(`user:${userId}:dashboard:`),
      this.cacheService.deleteByPrefix(`user:${userId}:transactions:`),
    ]);
    return toResponse(upserted[0]!);
  }
}
