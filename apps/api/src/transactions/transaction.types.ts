import { Field, Float, ID, InputType, Int, ObjectType } from '@nestjs/graphql';
import { Currency, TransactionType } from '../common/enums.js';
import type { Currency as CurrencyCode, TransactionType as TxType } from '@tutor-finance/shared';

@ObjectType('Transaction')
export class TransactionType_GQL {
  @Field(() => ID)
  id!: string;

  @Field(() => TransactionType)
  type!: TxType;

  @Field(() => Int)
  amount!: number;

  @Field(() => Currency)
  currency!: CurrencyCode;

  @Field(() => Date)
  occurredAt!: Date;

  @Field()
  category!: string;

  @Field(() => ID, { nullable: true })
  studentId?: string;

  @Field(() => ID, { nullable: true })
  lessonId?: string;

  @Field({ nullable: true })
  description?: string;

  @Field(() => Date)
  createdAt!: Date;

  @Field(() => Date)
  updatedAt!: Date;

  @Field(() => Float, {
    nullable: true,
    description: 'Amount converted to the requested target currency (minor units, integer).',
  })
  convertedAmount?: number;
}

@InputType('TransactionInput')
export class TransactionGqlInput {
  @Field(() => TransactionType)
  type!: TxType;

  @Field(() => Int)
  amount!: number;

  @Field(() => Currency)
  currency!: CurrencyCode;

  @Field(() => Date)
  occurredAt!: Date;

  @Field()
  category!: string;

  @Field(() => ID, { nullable: true })
  studentId?: string;

  @Field({ nullable: true })
  description?: string;
}

@InputType('TransactionPatch')
export class TransactionPatch {
  @Field(() => Int, { nullable: true })
  amount?: number;

  @Field(() => Currency, { nullable: true })
  currency?: CurrencyCode;

  @Field(() => Date, { nullable: true })
  occurredAt?: Date;

  @Field({ nullable: true })
  category?: string;

  @Field(() => ID, { nullable: true })
  studentId?: string;

  @Field({ nullable: true })
  description?: string;
}

@InputType('TransactionFilter')
export class TransactionFilter {
  @Field(() => TransactionType, { nullable: true })
  type?: TxType;

  @Field(() => Date, { nullable: true })
  from?: Date;

  @Field(() => Date, { nullable: true })
  to?: Date;

  @Field(() => ID, { nullable: true })
  studentId?: string;

  @Field(() => Int, { nullable: true, defaultValue: 200 })
  limit?: number;
}
