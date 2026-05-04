import { Field, InputType, Int, ObjectType } from '@nestjs/graphql';
import { Currency } from './enums.js';
import type { Currency as CurrencyCode } from '@tutor-finance/shared';

@ObjectType('Money')
export class MoneyType {
  @Field(() => Int)
  amount!: number;

  @Field(() => Currency)
  currency!: CurrencyCode;
}

@InputType('MoneyInput')
export class MoneyInput {
  @Field(() => Int)
  amount!: number;

  @Field(() => Currency)
  currency!: CurrencyCode;
}
