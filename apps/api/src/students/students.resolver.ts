import { Args, ID, Mutation, Query, Resolver } from '@nestjs/graphql';
import { StudentsService } from './students.service.js';
import { StudentType, StudentInput, StudentPatch } from './student.types.js';
import { CurrentUser, CurrentUserData } from '../auth/current-user.decorator.js';
import type { StudentDocument } from './student.schema.js';

function toGql(doc: StudentDocument | (StudentDocument & { _id: unknown })): StudentType {
  const obj = 'toObject' in doc ? doc.toObject() : (doc as unknown as Record<string, unknown>);
  return {
    id: String((obj as { _id: unknown })._id),
    name: (obj as { name: string }).name,
    email: (obj as { email?: string }).email,
    phone: (obj as { phone?: string }).phone,
    hourlyRate: (obj as { hourlyRate: StudentType['hourlyRate'] }).hourlyRate,
    defaultCurrency: (obj as { defaultCurrency: StudentType['defaultCurrency'] }).defaultCurrency,
    notes: (obj as { notes?: string }).notes,
    archivedAt: (obj as { archivedAt?: Date }).archivedAt,
    createdAt: (obj as { createdAt: Date }).createdAt,
    updatedAt: (obj as { updatedAt: Date }).updatedAt,
  };
}

@Resolver(() => StudentType)
export class StudentsResolver {
  constructor(private readonly service: StudentsService) {}

  @Query(() => [StudentType])
  async students(
    @CurrentUser() user: CurrentUserData,
    @Args('includeArchived', { type: () => Boolean, defaultValue: false })
    includeArchived: boolean,
  ): Promise<StudentType[]> {
    const docs = await this.service.list(user.id, includeArchived);
    return docs.map((d) => toGql(d as unknown as StudentDocument));
  }

  @Query(() => StudentType)
  async student(
    @CurrentUser() user: CurrentUserData,
    @Args('id', { type: () => ID }) id: string,
  ): Promise<StudentType> {
    const doc = await this.service.findById(user.id, id);
    return toGql(doc);
  }

  @Mutation(() => StudentType)
  async createStudent(
    @CurrentUser() user: CurrentUserData,
    @Args('input') input: StudentInput,
  ): Promise<StudentType> {
    const doc = await this.service.create(user.id, input);
    return toGql(doc);
  }

  @Mutation(() => StudentType)
  async updateStudent(
    @CurrentUser() user: CurrentUserData,
    @Args('id', { type: () => ID }) id: string,
    @Args('patch') patch: StudentPatch,
  ): Promise<StudentType> {
    const doc = await this.service.update(user.id, id, patch);
    return toGql(doc);
  }

  @Mutation(() => StudentType)
  async archiveStudent(
    @CurrentUser() user: CurrentUserData,
    @Args('id', { type: () => ID }) id: string,
  ): Promise<StudentType> {
    const doc = await this.service.archive(user.id, id);
    return toGql(doc);
  }

  @Mutation(() => StudentType)
  async unarchiveStudent(
    @CurrentUser() user: CurrentUserData,
    @Args('id', { type: () => ID }) id: string,
  ): Promise<StudentType> {
    const doc = await this.service.unarchive(user.id, id);
    return toGql(doc);
  }
}
