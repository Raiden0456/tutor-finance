import { Controller, Get, Query, Res } from '@nestjs/common';
import type { Response } from 'express';
import { IsDateString, IsIn, IsOptional } from 'class-validator';
import {
  convertMoney,
  SUPPORTED_CURRENCIES,
  type Currency,
  type CurrencyTotal,
} from '@tutor-finance/shared';
import { CurrentUser, type CurrentUserData } from '../auth/current-user.decorator.js';
import { RedisCacheService } from '../cache/redis-cache.service.js';
import { env } from '../config.js';
import { TransactionsService } from '../transactions/transactions.service.js';
import { FxService } from '../fx/fx.service.js';
import { SettingsService } from '../settings/settings.service.js';
import { LessonsService } from '../lessons/lessons.service.js';

class SummaryQueryDto {
  @IsDateString()
  from!: string;

  @IsDateString()
  to!: string;

  @IsOptional()
  @IsIn(SUPPORTED_CURRENCIES as unknown as string[])
  target?: Currency;
}

interface PeriodSummary {
  from: Date;
  to: Date;
  income: CurrencyTotal[];
  expense: CurrencyTotal[];
  incomeInTargetCurrency: number;
  expenseInTargetCurrency: number;
  netInTargetCurrency: number;
  plannedIncomeInTargetCurrency: number;
  targetCurrency: Currency;
}

@Controller('dashboard')
export class DashboardController {
  constructor(
    private readonly transactions: TransactionsService,
    private readonly fx: FxService,
    private readonly settings: SettingsService,
    private readonly lessons: LessonsService,
    private readonly cacheService: RedisCacheService,
  ) {}

  @Get('summary')
  async summary(
    @CurrentUser() user: CurrentUserData,
    @Query() q: SummaryQueryDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<PeriodSummary> {
    const settings = await this.settings.getOrCreate(user.id);
    const targetCurrency = (q.target ?? settings.primaryCurrency) as Currency;
    const from = new Date(q.from);
    const to = new Date(q.to);
    const cacheKey = `user:${user.id}:dashboard:summary:${from.toISOString()}:${to.toISOString()}:${targetCurrency}`;
    const cached = await this.cacheService.getJson<PeriodSummary>(cacheKey);
    if (cached) {
      res.setHeader('X-Cache', 'HIT');
      return cached;
    }
    res.setHeader('X-Cache', 'MISS');

    const [rows, plannedRaw] = await Promise.all([
      this.transactions.monthSummary(user.id, from, to),
      this.lessons.plannedIncomeRaw(user.id, from, to),
    ]);

    const income: CurrencyTotal[] = [];
    const expense: CurrencyTotal[] = [];
    for (const r of rows) {
      const total: CurrencyTotal = {
        currency: r.currency as Currency,
        amount: r.total,
        count: r.count,
      };
      if (r.type === 'income') income.push(total);
      else expense.push(total);
    }

    let rates: Record<string, number> = {};
    try {
      rates = await this.fx.getRatesMap();
    } catch {
      rates = {};
    }

    const sumIn = (rs: { amount: number; currency: Currency }[]) => {
      let acc = 0;
      for (const r of rs) {
        try {
          const c = convertMoney({ amount: r.amount, currency: r.currency }, targetCurrency, rates);
          acc += c.amount;
        } catch {
          if (r.currency === targetCurrency) acc += r.amount;
        }
      }
      return acc;
    };

    const incomeT = sumIn(income);
    const expenseT = sumIn(expense);
    const plannedT = sumIn(plannedRaw);

    const summary: PeriodSummary = {
      from,
      to,
      income,
      expense,
      incomeInTargetCurrency: incomeT,
      expenseInTargetCurrency: expenseT,
      netInTargetCurrency: incomeT - expenseT,
      plannedIncomeInTargetCurrency: plannedT,
      targetCurrency,
    };

    await this.cacheService.setJson(cacheKey, summary, env.cache.dashboardTtlSeconds);
    res.setHeader('X-Cache-TTL', String(env.cache.dashboardTtlSeconds));
    return summary;
  }
}
