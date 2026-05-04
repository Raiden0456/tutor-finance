import { Field, InputType, ObjectType } from '@nestjs/graphql';
import { MoneyInput, MoneyType } from '../common/money.type.js';
import { Currency } from '../common/enums.js';
import type { Currency as CurrencyCode } from '@tutor-finance/shared';

@ObjectType('Student')
export class StudentType {
  @Field(() => String)
  id!: string;

  @Field()
  name!: string;

  @Field({ nullable: true })
  email?: string;

  @Field({ nullable: true })
  phone?: string;

  @Field(() => MoneyType)
  hourlyRate!: MoneyType;

  @Field(() => Currency)
  defaultCurrency!: CurrencyCode;

  @Field({ nullable: true })
  notes?: string;

  @Field(() => Date, { nullable: true })
  archivedAt?: Date;

  @Field(() => Date)
  createdAt!: Date;

  @Field(() => Date)
  updatedAt!: Date;
}

@InputType('StudentInput')
export class StudentInput {
  @Field()
  name!: string;

  @Field({ nullable: true })
  email?: string;

  @Field({ nullable: true })
  phone?: string;

  @Field(() => MoneyInput)
  hourlyRate!: MoneyInput;

  @Field(() => Currency)
  defaultCurrency!: CurrencyCode;

  @Field({ nullable: true })
  notes?: string;
}

@InputType('StudentPatch')
export class StudentPatch {
  @Field({ nullable: true })
  name?: string;

  @Field({ nullable: true })
  email?: string;

  @Field({ nullable: true })
  phone?: string;

  @Field(() => MoneyInput, { nullable: true })
  hourlyRate?: MoneyInput;

  @Field(() => Currency, { nullable: true })
  defaultCurrency?: CurrencyCode;

  @Field({ nullable: true })
  notes?: string;
}
