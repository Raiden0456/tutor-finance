import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
} from '@nestjs/common';
import { CurrentUser } from '../auth/current-user.decorator.js';
import type { CurrentUserData } from '../auth/current-user.decorator.js';
import { RecurringLessonsService } from './recurring-lessons.service.js';
import type { RecurringLessonResponse } from './recurring-lessons.dto.js';
import {
  CreateRecurringLessonDto,
  UpdateRecurringLessonDto,
} from './recurring-lessons.dto.js';

@Controller('recurring-lessons')
export class RecurringLessonsController {
  constructor(private readonly service: RecurringLessonsService) {}

  @Get()
  list(@CurrentUser() user: CurrentUserData): Promise<RecurringLessonResponse[]> {
    return this.service.list(user.id);
  }

  @Post()
  create(
    @CurrentUser() user: CurrentUserData,
    @Body() input: CreateRecurringLessonDto,
  ): Promise<RecurringLessonResponse> {
    return this.service.create(user.id, input);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: CurrentUserData,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() patch: UpdateRecurringLessonDto,
  ): Promise<RecurringLessonResponse> {
    return this.service.update(user.id, id, patch);
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
