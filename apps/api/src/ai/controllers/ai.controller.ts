import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Throttle } from '@nestjs/throttler';
import type {
  AiDigestResponse,
  AiDigestState,
  AiPendingAction,
  AiStatusResponse,
  AiTranscriptionResponse,
} from '@tutor-finance/shared';
import { env } from '../../config.js';
import { ConfirmAllActionsDto } from '../dto/ai.dto.js';
import { CurrentUser, type CurrentUserData } from '../../auth/current-user.decorator.js';
import { AiActionsService } from '../services/ai-actions.service.js';
import { AiAgentService } from '../services/ai-agent.service.js';
import { AiSettingsService } from '../services/ai-settings.service.js';
import {
  AiTranscriptionService,
  MAX_AUDIO_BYTES,
  type UploadedAudio,
} from '../services/ai-transcription.service.js';

@Throttle({ default: { limit: 30, ttl: 60_000 } })
@Controller('ai')
export class AiController {
  constructor(
    private readonly settings: AiSettingsService,
    private readonly agent: AiAgentService,
    private readonly actions: AiActionsService,
    private readonly transcription: AiTranscriptionService,
  ) {}

  @Get('status')
  status(@CurrentUser() user: CurrentUserData): Promise<AiStatusResponse> {
    return this.settings.status(user.id);
  }

  @Post('consent')
  @HttpCode(200)
  async giveConsent(@CurrentUser() user: CurrentUserData): Promise<AiStatusResponse> {
    await this.settings.setConsent(user.id, true);
    return this.settings.status(user.id);
  }

  @Delete('consent')
  async revokeConsent(@CurrentUser() user: CurrentUserData): Promise<AiStatusResponse> {
    await this.settings.setConsent(user.id, false);
    return this.settings.status(user.id);
  }

  @Get('digest')
  async digest(@CurrentUser() user: CurrentUserData): Promise<AiDigestState> {
    return { digest: await this.agent.getDigest(user.id), morningHour: env.ai.digestHour };
  }

  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post('digest')
  @HttpCode(200)
  generateDigest(@CurrentUser() user: CurrentUserData): Promise<AiDigestResponse> {
    return this.agent.generateDigest(user.id);
  }

  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @Post('transcribe')
  @HttpCode(200)
  @UseInterceptors(FileInterceptor('audio', { limits: { fileSize: MAX_AUDIO_BYTES, files: 1 } }))
  transcribe(
    @CurrentUser() user: CurrentUserData,
    @UploadedFile() audio: UploadedAudio | undefined,
  ): Promise<AiTranscriptionResponse> {
    return this.transcription.transcribe(user.id, audio);
  }

  @Post('actions/confirm-all')
  @HttpCode(200)
  confirmAll(
    @CurrentUser() user: CurrentUserData,
    @Body() body: ConfirmAllActionsDto,
  ): Promise<AiPendingAction[]> {
    return this.actions.confirmAll(user.id, body.ids);
  }

  @Post('actions/:id/confirm')
  @HttpCode(200)
  confirm(
    @CurrentUser() user: CurrentUserData,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<AiPendingAction> {
    return this.actions.confirm(user.id, id);
  }

  @Post('actions/:id/reject')
  @HttpCode(200)
  reject(
    @CurrentUser() user: CurrentUserData,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<AiPendingAction> {
    return this.actions.reject(user.id, id);
  }
}
