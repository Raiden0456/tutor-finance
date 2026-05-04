import { Args, ID, Mutation, Query, Resolver } from '@nestjs/graphql';
import { LessonType, LessonGqlInput, LessonPatch, LessonFilter } from './lesson.types.js';
import { LessonsService } from './lessons.service.js';
import { CurrentUser, CurrentUserData } from '../auth/current-user.decorator.js';
import type { LessonDocument } from './lesson.schema.js';

function toGql(doc: LessonDocument | Record<string, unknown>): LessonType {
  const obj = (doc as { toObject?: () => Record<string, unknown> }).toObject
    ? (doc as { toObject: () => Record<string, unknown> }).toObject()
    : (doc as Record<string, unknown>);
  return {
    id: String(obj._id),
    studentId: String(obj.studentId),
    startsAt: obj.startsAt as Date,
    durationMin: obj.durationMin as number,
    status: obj.status as LessonType['status'],
    priceOverride: obj.priceOverride as LessonType['priceOverride'],
    notes: obj.notes as string | undefined,
    createdAt: obj.createdAt as Date,
    updatedAt: obj.updatedAt as Date,
  };
}

@Resolver(() => LessonType)
export class LessonsResolver {
  constructor(private readonly service: LessonsService) {}

  @Query(() => [LessonType])
  async lessons(
    @CurrentUser() user: CurrentUserData,
    @Args('filter', { type: () => LessonFilter, nullable: true }) filter?: LessonFilter,
  ): Promise<LessonType[]> {
    const docs = await this.service.list(user.id, filter);
    return docs.map((d) => toGql(d as Record<string, unknown>));
  }

  @Query(() => LessonType)
  async lesson(
    @CurrentUser() user: CurrentUserData,
    @Args('id', { type: () => ID }) id: string,
  ): Promise<LessonType> {
    const doc = await this.service.findById(user.id, id);
    return toGql(doc);
  }

  @Mutation(() => LessonType)
  async createLesson(
    @CurrentUser() user: CurrentUserData,
    @Args('input') input: LessonGqlInput,
  ): Promise<LessonType> {
    const doc = await this.service.create(user.id, input);
    return toGql(doc);
  }

  @Mutation(() => LessonType)
  async updateLesson(
    @CurrentUser() user: CurrentUserData,
    @Args('id', { type: () => ID }) id: string,
    @Args('patch') patch: LessonPatch,
  ): Promise<LessonType> {
    const doc = await this.service.update(user.id, id, patch);
    return toGql(doc);
  }

  @Mutation(() => Boolean)
  deleteLesson(
    @CurrentUser() user: CurrentUserData,
    @Args('id', { type: () => ID }) id: string,
  ): Promise<boolean> {
    return this.service.remove(user.id, id);
  }
}
