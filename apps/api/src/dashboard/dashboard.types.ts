import { Field, Int, ObjectType } from '@nestjs/graphql';
import { Currency } from '../common/enums.js';
import type { Currency as CurrencyCode } from '@tutor-finance/shared';

@ObjectType('CurrencyTotal')
export class CurrencyTotal {
  @Field(() => Currency)
  currency!: CurrencyCode;

  @Field(() => Int)
  amount!: number;

  @Field(() => Int)
  count!: number;
}

@ObjectType('PeriodSummary')
export class PeriodSummary {
  @Field(() => Date)
  from!: Date;

  @Field(() => Date)
  to!: Date;

  @Field(() => [CurrencyTotal])
  income!: CurrencyTotal[];

  @Field(() => [CurrencyTotal])
  expense!: CurrencyTotal[];

  @Field(() => Int, { description: 'Net income (target currency, minor units).' })
  netInTargetCurrency!: number;

  @Field(() => Int, { description: 'Income (target currency, minor units).' })
  incomeInTargetCurrency!: number;

  @Field(() => Int, { description: 'Expense (target currency, minor units).' })
  expenseInTargetCurrency!: number;

  @Field(() => Currency)
  targetCurrency!: CurrencyCode;
}
