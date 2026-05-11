import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post } from '@nestjs/common';
import { CurrentUser, type CurrentUserData } from '../auth/current-user.decorator.js';
import { RecurringService } from './recurring.service.js';
import {
  CreateRecurringDto,
  UpdateRecurringDto,
  type RecurringResponse,
} from './recurring.dto.js';

@Controller('recurring')
export class RecurringController {
  constructor(private readonly service: RecurringService) {}

  @Get()
  list(@CurrentUser() user: CurrentUserData): Promise<RecurringResponse[]> {
    return this.service.list(user.id);
  }

  @Post()
  create(
    @CurrentUser() user: CurrentUserData,
    @Body() input: CreateRecurringDto,
  ): Promise<RecurringResponse> {
    return this.service.create(user.id, input);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: CurrentUserData,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() patch: UpdateRecurringDto,
  ): Promise<RecurringResponse> {
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
