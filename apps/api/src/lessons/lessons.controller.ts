import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import { CurrentUser, type CurrentUserData } from '../auth/current-user.decorator.js';
import { LessonsService } from './lessons.service.js';
import { CreateLessonDto, LessonFilterDto, UpdateLessonDto, type LessonResponse } from './lessons.dto.js';

@Controller('lessons')
export class LessonsController {
  constructor(private readonly service: LessonsService) {}

  @Get()
  list(
    @CurrentUser() user: CurrentUserData,
    @Query() filter: LessonFilterDto,
  ): Promise<LessonResponse[]> {
    return this.service.list(user.id, filter);
  }

  @Get(':id')
  findOne(
    @CurrentUser() user: CurrentUserData,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<LessonResponse> {
    return this.service.findById(user.id, id);
  }

  @Post()
  create(
    @CurrentUser() user: CurrentUserData,
    @Body() input: CreateLessonDto,
  ): Promise<LessonResponse> {
    return this.service.create(user.id, input);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: CurrentUserData,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() patch: UpdateLessonDto,
  ): Promise<LessonResponse> {
    return this.service.update(user.id, id, patch);
  }

  @Post(':id/archive')
  async archive(
    @CurrentUser() user: CurrentUserData,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<LessonResponse> {
    return this.service.archive(user.id, id);
  }

  @Delete('archive')
  async deleteArchive(
    @CurrentUser() user: CurrentUserData,
  ): Promise<{ ok: boolean; count: number }> {
    const count = await this.service.deleteArchive(user.id);
    return { ok: true, count };
  }

  @Delete(':id')
  async remove(
    @CurrentUser() user: CurrentUserData,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<{ ok: boolean }> {
    const ok = await this.service.remove(user.id, id);
    return { ok };
  }
}
