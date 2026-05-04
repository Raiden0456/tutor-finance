import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { FxRateType } from './fx.types.js';
import { FxService } from './fx.service.js';
import { Currency } from '../common/enums.js';
import type { Currency as CurrencyCode } from '@tutor-finance/shared';

@Resolver(() => FxRateType)
export class FxResolver {
  constructor(private readonly service: FxService) {}

  @Query(() => Number, { nullable: true, description: 'Convert minor-unit amount; null if rate missing.' })
  async fxConvert(
    @Args('amount') amount: number,
    @Args('from', { type: () => Currency }) from: CurrencyCode,
    @Args('to', { type: () => Currency }) to: CurrencyCode,
  ): Promise<number | null> {
    if (from === to) return amount;
    const rates = await this.service.getRatesMap();
    const fx = rates[`${from}_${to}`];
    if (typeof fx !== 'number') return null;
    return Math.round(amount * fx);
  }

  @Mutation(() => Boolean)
  async refreshFxRates(): Promise<boolean> {
    await this.service.refresh();
    return true;
  }
}
