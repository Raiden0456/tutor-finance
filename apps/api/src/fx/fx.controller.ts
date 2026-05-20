import { Controller, DefaultValuePipe, Get, ParseIntPipe, Post, Query } from '@nestjs/common';
import { CurrentUser, type CurrentUserData } from '../auth/current-user.decorator.js';
import { FxService } from './fx.service.js';

@Controller('fx')
export class FxController {
  constructor(private readonly service: FxService) {}

  @Get('convert')
  async convert(
    @Query('amount', new DefaultValuePipe(0), ParseIntPipe) amount: number,
    @Query('from') from: string,
    @Query('to') to: string,
  ): Promise<{ amount: number | null }> {
    return { amount: await this.service.convert(amount, from, to) };
  }

  @Post('refresh')
  async refresh(@CurrentUser() _user: CurrentUserData): Promise<{ ok: boolean }> {
    await this.service.refresh();
    return { ok: true };
  }
}
