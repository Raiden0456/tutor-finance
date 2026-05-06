import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import { CurrentUser, type CurrentUserData } from '../auth/current-user.decorator.js';
import { TransactionsService } from './transactions.service.js';
import {
  CreateTransactionDto,
  TransactionFilterDto,
  UpdateTransactionDto,
  type TransactionResponse,
} from './transactions.dto.js';

@Controller('transactions')
export class TransactionsController {
  constructor(private readonly service: TransactionsService) {}

  @Get()
  list(
    @CurrentUser() user: CurrentUserData,
    @Query() filter: TransactionFilterDto,
  ): Promise<TransactionResponse[]> {
    return this.service.list(user.id, filter);
  }

  @Get(':id')
  findOne(
    @CurrentUser() user: CurrentUserData,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<TransactionResponse> {
    return this.service.findById(user.id, id);
  }

  @Post()
  create(
    @CurrentUser() user: CurrentUserData,
    @Body() input: CreateTransactionDto,
  ): Promise<TransactionResponse> {
    return this.service.create(user.id, input);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: CurrentUserData,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() patch: UpdateTransactionDto,
  ): Promise<TransactionResponse> {
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
