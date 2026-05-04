import { Args, ID, Mutation, Query, ResolveField, Resolver, Root } from '@nestjs/graphql';
import {
  TransactionType_GQL,
  TransactionGqlInput,
  TransactionPatch,
  TransactionFilter,
} from './transaction.types.js';
import { TransactionsService } from './transactions.service.js';
import { CurrentUser, CurrentUserData } from '../auth/current-user.decorator.js';
import { Currency } from '../common/enums.js';
import type { Currency as CurrencyCode } from '@tutor-finance/shared';
import { FxService } from '../fx/fx.service.js';
import { convertMoney } from '@tutor-finance/shared';
import type { TransactionDocument } from './transaction.schema.js';

function toGql(doc: TransactionDocument | Record<string, unknown>): TransactionType_GQL {
  const obj = (doc as { toObject?: () => Record<string, unknown> }).toObject
    ? (doc as { toObject: () => Record<string, unknown> }).toObject()
    : (doc as Record<string, unknown>);
  return {
    id: String(obj._id),
    type: obj.type as TransactionType_GQL['type'],
    amount: obj.amount as number,
    currency: obj.currency as CurrencyCode,
    occurredAt: obj.occurredAt as Date,
    category: obj.category as string,
    studentId: obj.studentId ? String(obj.studentId) : undefined,
    lessonId: obj.lessonId ? String(obj.lessonId) : undefined,
    description: obj.description as string | undefined,
    createdAt: obj.createdAt as Date,
    updatedAt: obj.updatedAt as Date,
  };
}

@Resolver(() => TransactionType_GQL)
export class TransactionsResolver {
  constructor(
    private readonly service: TransactionsService,
    private readonly fx: FxService,
  ) {}

  @Query(() => [TransactionType_GQL])
  async transactions(
    @CurrentUser() user: CurrentUserData,
    @Args('filter', { type: () => TransactionFilter, nullable: true })
    filter?: TransactionFilter,
  ): Promise<TransactionType_GQL[]> {
    const docs = await this.service.list(user.id, filter);
    return docs.map((d) => toGql(d as Record<string, unknown>));
  }

  @Query(() => TransactionType_GQL)
  async transaction(
    @CurrentUser() user: CurrentUserData,
    @Args('id', { type: () => ID }) id: string,
  ): Promise<TransactionType_GQL> {
    const doc = await this.service.findById(user.id, id);
    return toGql(doc);
  }

  @Mutation(() => TransactionType_GQL)
  async createTransaction(
    @CurrentUser() user: CurrentUserData,
    @Args('input') input: TransactionGqlInput,
  ): Promise<TransactionType_GQL> {
    const doc = await this.service.create(user.id, input);
    return toGql(doc);
  }

  @Mutation(() => TransactionType_GQL)
  async updateTransaction(
    @CurrentUser() user: CurrentUserData,
    @Args('id', { type: () => ID }) id: string,
    @Args('patch') patch: TransactionPatch,
  ): Promise<TransactionType_GQL> {
    const doc = await this.service.update(user.id, id, patch);
    return toGql(doc);
  }

  @Mutation(() => Boolean)
  deleteTransaction(
    @CurrentUser() user: CurrentUserData,
    @Args('id', { type: () => ID }) id: string,
  ): Promise<boolean> {
    return this.service.remove(user.id, id);
  }

  @ResolveField(() => Number, { nullable: true })
  async convertedAmount(
    @Root() tx: TransactionType_GQL,
    @Args('target', { type: () => Currency }) target: CurrencyCode,
  ): Promise<number | undefined> {
    if (tx.currency === target) return tx.amount;
    try {
      const rates = await this.fx.getRatesMap();
      const converted = convertMoney({ amount: tx.amount, currency: tx.currency }, target, rates);
      return converted.amount;
    } catch {
      return undefined;
    }
  }
}
