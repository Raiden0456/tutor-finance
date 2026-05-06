import { Controller, Get, Query } from '@nestjs/common';
import { IsDateString, IsIn, IsOptional } from 'class-validator';
import { convertMoney, SUPPORTED_CURRENCIES, type Currency } from '@tutor-finance/shared';
import { CurrentUser, type CurrentUserData } from '../auth/current-user.decorator.js';
import { TransactionsService } from '../transactions/transactions.service.js';
import { FxService } from '../fx/fx.service.js';
import { SettingsService } from '../settings/settings.service.js';

class SummaryQueryDto {
  @IsDateString()
  from!: string;

  @IsDateString()
  to!: string;

  @IsOptional()
  @IsIn(SUPPORTED_CURRENCIES as unknown as string[])
  target?: Currency;
}

interface CurrencyTotal {
  currency: Currency;
  amount: number;
  count: number;
}

interface PeriodSummary {
  from: Date;
  to: Date;
  income: CurrencyTotal[];
  expense: CurrencyTotal[];
  incomeInTargetCurrency: number;
  expenseInTargetCurrency: number;
  netInTargetCurrency: number;
  targetCurrency: Currency;
}

@Controller('dashboard')
export class DashboardController {
  constructor(
    private readonly transactions: TransactionsService,
    private readonly fx: FxService,
    private readonly settings: SettingsService,
  ) {}

  @Get('summary')
  async summary(
    @CurrentUser() user: CurrentUserData,
    @Query() q: SummaryQueryDto,
  ): Promise<PeriodSummary> {
    const settings = await this.settings.getOrCreate(user.id);
    const targetCurrency = (q.target ?? settings.primaryCurrency) as Currency;
    const from = new Date(q.from);
    const to = new Date(q.to);
    const rows = await this.transactions.monthSummary(user.id, from, to);

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
    const sumIn = (rs: CurrencyTotal[]) => {
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

    return {
      from,
      to,
      income,
      expense,
      incomeInTargetCurrency: incomeT,
      expenseInTargetCurrency: expenseT,
      netInTargetCurrency: incomeT - expenseT,
      targetCurrency,
    };
  }
}
