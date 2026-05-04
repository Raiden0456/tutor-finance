import { Field, ID, InputType, Int, ObjectType } from '@nestjs/graphql';
import { LessonStatus } from '../common/enums.js';
import type { LessonStatus as LessonStatusType } from '@tutor-finance/shared';
import { MoneyInput, MoneyType } from '../common/money.type.js';

@ObjectType('Lesson')
export class LessonType {
  @Field(() => ID)
  id!: string;

  @Field(() => ID)
  studentId!: string;

  @Field(() => Date)
  startsAt!: Date;

  @Field(() => Int)
  durationMin!: number;

  @Field(() => LessonStatus)
  status!: LessonStatusType;

  @Field(() => MoneyType, { nullable: true })
  priceOverride?: MoneyType;

  @Field({ nullable: true })
  notes?: string;

  @Field(() => Date)
  createdAt!: Date;

  @Field(() => Date)
  updatedAt!: Date;
}

@InputType('LessonInput')
export class LessonGqlInput {
  @Field(() => ID)
  studentId!: string;

  @Field(() => Date)
  startsAt!: Date;

  @Field(() => Int)
  durationMin!: number;

  @Field(() => LessonStatus, { defaultValue: LessonStatus.scheduled })
  status!: LessonStatusType;

  @Field(() => MoneyInput, { nullable: true })
  priceOverride?: MoneyInput;

  @Field({ nullable: true })
  notes?: string;
}

@InputType('LessonPatch')
export class LessonPatch {
  @Field(() => Date, { nullable: true })
  startsAt?: Date;

  @Field(() => Int, { nullable: true })
  durationMin?: number;

  @Field(() => LessonStatus, { nullable: true })
  status?: LessonStatusType;

  @Field(() => MoneyInput, { nullable: true })
  priceOverride?: MoneyInput;

  @Field({ nullable: true })
  notes?: string;
}

@InputType('LessonFilter')
export class LessonFilter {
  @Field(() => ID, { nullable: true })
  studentId?: string;

  @Field(() => LessonStatus, { nullable: true })
  status?: LessonStatusType;

  @Field(() => Date, { nullable: true })
  from?: Date;

  @Field(() => Date, { nullable: true })
  to?: Date;

  @Field(() => Int, { nullable: true, defaultValue: 200 })
  limit?: number;
}
