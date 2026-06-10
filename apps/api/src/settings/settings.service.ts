import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import type { Currency, Locale, Theme, WeekStartsOn } from '@tutor-finance/shared';
import { RedisCacheService } from '../cache/redis-cache.service.js';
import { env } from '../config.js';
import { DB } from '../db/db.module.js';
import type { Database } from '../db/client.js';
import { account, user, userSettings } from '../db/schema.js';
import type {
  AccountProfileResponse,
  AccountSecurityResponse,
  SettingsResponse,
  UpdateSettingsDto,
} from './settings.dto.js';

type Row = typeof userSettings.$inferSelect;

function toResponse(
  r: Row,
  accountSecurity: AccountSecurityResponse,
  profile: AccountProfileResponse,
): SettingsResponse {
  return {
    primaryCurrency: r.primaryCurrency as Currency,
    theme: r.theme as Theme,
    locale: r.locale as Locale,
    weekStartsOn: r.weekStartsOn as WeekStartsOn,
    lessonReminderMinutes: r.lessonReminderMinutes,
    accountSecurity,
    profile,
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
    if (
      cached?.weekStartsOn !== undefined &&
      cached.lessonReminderMinutes !== undefined &&
      cached.accountSecurity &&
      cached.profile
    )
      return cached;

    await this.db.insert(userSettings).values({ userId }).onConflictDoNothing();

    const [settings] = await this.db
      .select()
      .from(userSettings)
      .where(eq(userSettings.userId, userId))
      .limit(1);
    const response = toResponse(
      settings!,
      await this.getAccountSecurity(userId),
      await this.getAccountProfile(userId),
    );
    await this.cacheService.setJson(cacheKey, response, env.cache.dataTtlSeconds);
    return response;
  }

  async getAccountProfile(userId: string): Promise<AccountProfileResponse> {
    const [row] = await this.db
      .select({ name: user.name, email: user.email })
      .from(user)
      .where(eq(user.id, userId))
      .limit(1);

    if (!row) throw new BadRequestException('User not found');
    return { name: row.name || null, email: row.email };
  }

  async getAccountSecurity(userId: string): Promise<AccountSecurityResponse> {
    const rows = await this.db
      .select({ providerId: account.providerId, password: account.password })
      .from(account)
      .where(eq(account.userId, userId));

    return {
      hasPassword: rows.some((row) => !!row.password),
      providers: [...new Set(rows.map((row) => row.providerId))],
    };
  }

  async update(userId: string, patch: UpdateSettingsDto): Promise<SettingsResponse> {
    if (Object.keys(patch).length === 0) {
      throw new BadRequestException('PATCH body must not be empty');
    }

    const set: Partial<typeof userSettings.$inferInsert> = {};
    if (patch.primaryCurrency !== undefined) set.primaryCurrency = patch.primaryCurrency;
    if (patch.theme !== undefined) set.theme = patch.theme;
    if (patch.locale !== undefined) set.locale = patch.locale;
    if (patch.weekStartsOn !== undefined) set.weekStartsOn = patch.weekStartsOn;
    if (patch.lessonReminderMinutes !== undefined)
      set.lessonReminderMinutes = patch.lessonReminderMinutes;

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
    return toResponse(
      upserted[0]!,
      await this.getAccountSecurity(userId),
      await this.getAccountProfile(userId),
    );
  }

  async assertCanSetPassword(userId: string): Promise<void> {
    const security = await this.getAccountSecurity(userId);
    if (security.hasPassword) {
      throw new BadRequestException('Password already exists. Use change password instead.');
    }
  }

  async clearSettingsCache(userId: string): Promise<void> {
    await this.cacheService.del(`user:${userId}:settings:me`);
  }
}
