import { Field, Float, ObjectType } from '@nestjs/graphql';
import { Currency } from '../common/enums.js';
import type { Currency as CurrencyCode } from '@tutor-finance/shared';

@ObjectType('FxRate')
export class FxRateType {
  @Field(() => Currency)
  base!: CurrencyCode;

  @Field(() => Currency)
  quote!: CurrencyCode;

  @Field(() => Float)
  rate!: number;

  @Field(() => Date)
  fetchedAt!: Date;
}
