import { Controller, DefaultValuePipe, Get, ParseIntPipe, Query } from '@nestjs/common';
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
}
