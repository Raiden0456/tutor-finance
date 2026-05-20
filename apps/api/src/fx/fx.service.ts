import { BadRequestException, Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { desc, eq } from 'drizzle-orm';
import {
  convertMoney,
  isSupportedCurrency,
  SUPPORTED_CURRENCIES,
  type Currency,
} from '@tutor-finance/shared';
import { DB } from '../db/db.module.js';
import type { Database } from '../db/client.js';
import { fxRates } from '../db/schema.js';
import { RedisCacheService } from '../cache/redis-cache.service.js';
import { env } from '../config.js';

const FX_CACHE_KEY = 'fx:rates:expanded';
const FX_FETCH_TIMEOUT_MS = 10_000;

const FIAT = SUPPORTED_CURRENCIES.filter((c) => c !== 'USDT' && c !== 'USDC');
const BASE = 'USD';

interface ExchangeHostResponse {
  base?: string;
  rates?: Record<string, number>;
}

@Injectable()
export class FxService implements OnModuleInit {
  private readonly logger = new Logger(FxService.name);
  private cache: { rates: Record<string, number>; fetchedAt: number } | undefined;

  constructor(
    @Inject(DB) private readonly db: Database,
    private readonly cacheService: RedisCacheService,
  ) {}

  async onModuleInit() {
    try {
      await this.refresh();
    } catch (err) {
      this.logger.warn(`Initial FX refresh failed: ${(err as Error).message}`);
    }
  }

  @Cron(CronExpression.EVERY_DAY_AT_6AM)
  async daily() {
    try {
      await this.refresh();
    } catch (err) {
      this.logger.warn(`Scheduled FX refresh failed: ${(err as Error).message}`);
    }
  }

  async refresh() {
    const symbols = FIAT.filter((c) => c !== BASE).join(',');
    const url = `${env.fxApiUrl}?base=${BASE}&symbols=${symbols}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(FX_FETCH_TIMEOUT_MS) });
    if (!res.ok) throw new Error(`FX API ${res.status}`);
    const data = (await res.json()) as ExchangeHostResponse;
    if (!data.rates) throw new Error('FX response missing rates');
    const fetchedAt = new Date();
    const rates = data.rates;

    for (const [quote, rate] of Object.entries(rates)) {
      await this.db
        .insert(fxRates)
        .values({ base: BASE, quote, rate, fetchedAt })
        .onConflictDoUpdate({
          target: [fxRates.base, fxRates.quote],
          set: { rate, fetchedAt },
        });
    }

    this.cache = { rates: this.expand(rates), fetchedAt: Date.now() };
    await this.cacheService.setJson(FX_CACHE_KEY, this.cache, env.cache.fxTtlSeconds);
    this.logger.log(`FX rates refreshed (${Object.keys(rates).length} pairs)`);
    return this.cache.rates;
  }

  private expand(usdRates: Record<string, number>): Record<string, number> {
    const all: Record<string, number> = {};
    const base: Record<string, number> = { USD: 1, ...usdRates };
    for (const from of Object.keys(base)) {
      for (const to of Object.keys(base)) {
        if (from === to) continue;
        const a = base[from];
        const b = base[to];
        if (typeof a === 'number' && typeof b === 'number' && a !== 0) {
          all[`${from}_${to}`] = b / a;
        }
      }
    }
    return all;
  }

  async getRatesMap(): Promise<Record<string, number>> {
    if (this.cache && Date.now() - this.cache.fetchedAt < env.cache.fxTtlSeconds * 1000) {
      return this.cache.rates;
    }

    const cached = await this.cacheService.getJson<{
      rates: Record<string, number>;
      fetchedAt: number;
    }>(FX_CACHE_KEY);
    if (cached && Date.now() - cached.fetchedAt < env.cache.fxTtlSeconds * 1000) {
      this.cache = cached;
      return cached.rates;
    }

    const rows = await this.db
      .select()
      .from(fxRates)
      .where(eq(fxRates.base, BASE))
      .orderBy(desc(fxRates.fetchedAt));
    if (rows.length === 0) {
      return this.refresh();
    }

    const newest = rows[0]?.fetchedAt;
    if (!newest || Date.now() - newest.getTime() >= env.cache.fxTtlSeconds * 1000) {
      return this.refresh();
    }
    const usdRates: Record<string, number> = {};
    for (const r of rows) usdRates[r.quote] = r.rate;
    const expanded = this.expand(usdRates);
    this.cache = { rates: expanded, fetchedAt: Date.now() };
    await this.cacheService.setJson(FX_CACHE_KEY, this.cache, env.cache.fxTtlSeconds);
    return expanded;
  }

  async convert(amount: number, from: string, to: string): Promise<number | null> {
    if (!Number.isInteger(amount) || amount < 0) {
      throw new BadRequestException('amount must be a non-negative integer');
    }
    if (!isSupportedCurrency(from) || !isSupportedCurrency(to)) {
      throw new BadRequestException('Unsupported currency');
    }
    if (from === to) return amount;

    const rates = await this.getRatesMap();
    try {
      return convertMoney({ amount, currency: from as Currency }, to as Currency, rates).amount;
    } catch {
      return null;
    }
  }
}
