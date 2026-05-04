import { Args, Query, Resolver } from '@nestjs/graphql';
import { PeriodSummary, CurrencyTotal } from './dashboard.types.js';
import { TransactionsService } from '../transactions/transactions.service.js';
import { FxService } from '../fx/fx.service.js';
import { SettingsService } from '../settings/settings.service.js';
import { CurrentUser, CurrentUserData } from '../auth/current-user.decorator.js';
import { Currency } from '../common/enums.js';
import { convertMoney, type Currency as CurrencyCode } from '@tutor-finance/shared';

@Resolver(() => PeriodSummary)
export class DashboardResolver {
  constructor(
    private readonly transactions: TransactionsService,
    private readonly fx: FxService,
    private readonly settings: SettingsService,
  ) {}

  @Query(() => PeriodSummary)
  async monthSummary(
    @CurrentUser() user: CurrentUserData,
    @Args('from', { type: () => Date }) from: Date,
    @Args('to', { type: () => Date }) to: Date,
    @Args('target', { type: () => Currency, nullable: true }) target?: CurrencyCode,
  ): Promise<PeriodSummary> {
    const settings = await this.settings.getOrCreate(user.id);
    const targetCurrency = (target ?? settings.primaryCurrency) as CurrencyCode;
    const rows = await this.transactions.monthSummary(user.id, from, to);
    const income: CurrencyTotal[] = [];
    const expense: CurrencyTotal[] = [];
    for (const r of rows) {
      const total: CurrencyTotal = {
        currency: r._id.currency as CurrencyCode,
        amount: r.total,
        count: r.count,
      };
      if (r._id.type === 'income') income.push(total);
      else expense.push(total);
    }
    let rates: Record<string, number> = {};
    try {
      rates = await this.fx.getRatesMap();
    } catch {
      rates = {};
    }
    const sumIn = (rows: CurrencyTotal[]) => {
      let acc = 0;
      for (const r of rows) {
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
