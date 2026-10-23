import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { AiChatgptConnectResponse, AiStatusResponse } from '@tutor-finance/shared';
import { CurrentUser, type CurrentUserData } from '../../auth/current-user.decorator.js';
import { ChatgptEnabledGuard } from '../guards/chatgpt-enabled.guard.js';
import { ChatgptCallbackDto, ChatgptDisconnectQueryDto, ConnectQueryDto } from '../dto/ai.dto.js';
import { AiSettingsService } from '../services/ai-settings.service.js';
import { ChatgptConnectionService } from '../services/chatgpt-connection.service.js';

@Throttle({ default: { limit: 20, ttl: 60_000 } })
@Controller('ai/chatgpt')
export class ChatgptController {
  constructor(
    private readonly connection: ChatgptConnectionService,
    private readonly settings: AiSettingsService,
  ) {}

  @Get('connect')
  @UseGuards(ChatgptEnabledGuard)
  connect(
    @CurrentUser() user: CurrentUserData,
    @Query() q: ConnectQueryDto,
  ): Promise<AiChatgptConnectResponse> {
    return this.connection.startConnect(user.id, q.returnTo);
  }

  @Post('callback')
  @UseGuards(ChatgptEnabledGuard)
  @HttpCode(200)
  async pasteCallback(
    @CurrentUser() user: CurrentUserData,
    @Body() body: ChatgptCallbackDto,
  ): Promise<AiStatusResponse> {
    let url: URL;
    try {
      url = new URL(body.callbackUrl.trim());
    } catch {
      throw new BadRequestException(
        'callbackUrl must be the full URL from the browser address bar',
      );
    }
    const result = await this.connection.completeCallback(
      Object.fromEntries(url.searchParams),
      user.id,
    );
    if (!result.ok) throw new BadRequestException(`ChatGPT sign-in failed: ${result.reason}`);
    return this.settings.status(user.id);
  }

  @Delete()
  async disconnect(
    @CurrentUser() user: CurrentUserData,
    @Query() q: ChatgptDisconnectQueryDto,
  ): Promise<{ revoked: boolean }> {
    return this.connection.disconnect(user.id, q.forget ?? false);
  }
}
