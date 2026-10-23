import { Controller, Get, Query, Res, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { Public } from '@thallesp/nestjs-better-auth';
import type { Response } from 'express';
import { ChatgptEnabledGuard } from '../guards/chatgpt-enabled.guard.js';
import {
  ChatgptConnectionService,
  type CallbackParams,
} from '../services/chatgpt-connection.service.js';

@Throttle({ default: { limit: 20, ttl: 60_000 } })
@Controller('auth')
export class ChatgptCallbackController {
  constructor(private readonly connection: ChatgptConnectionService) {}

  @Public()
  @Get('callback')
  @UseGuards(ChatgptEnabledGuard)
  async callback(@Query() params: CallbackParams, @Res() res: Response): Promise<void> {
    const result = await this.connection.completeCallback(params);
    if (!result.returnTo) {
      res
        .status(400)
        .type('text/plain')
        .send('ChatGPT sign-in expired. Return to the app and try again.');
      return;
    }
    const target = new URL(result.returnTo);
    target.searchParams.set('ai_chatgpt', result.ok ? 'connected' : 'error');
    if (!result.ok) target.searchParams.set('reason', result.reason);
    res.redirect(302, target.toString());
  }
}
