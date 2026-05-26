import { Body, Controller, Get, Patch, Post, Req } from '@nestjs/common';
import type { Request } from 'express';
import { CurrentUser, type CurrentUserData } from '../auth/current-user.decorator.js';
import { auth } from '../auth/auth.provider.js';
import { SettingsService } from './settings.service.js';
import { SetPasswordDto, UpdateSettingsDto, type SettingsResponse } from './settings.dto.js';

function toHeaders(headers: Request['headers']): Headers {
  const out = new Headers();
  for (const [key, value] of Object.entries(headers)) {
    if (Array.isArray(value)) {
      for (const item of value) out.append(key, item);
    } else if (value !== undefined) {
      out.set(key, value);
    }
  }
  return out;
}

@Controller('settings')
export class SettingsController {
  constructor(private readonly service: SettingsService) {}

  @Get('me')
  me(@CurrentUser() user: CurrentUserData): Promise<SettingsResponse> {
    return this.service.getOrCreate(user.id);
  }

  @Patch('me')
  update(
    @CurrentUser() user: CurrentUserData,
    @Body() patch: UpdateSettingsDto,
  ): Promise<SettingsResponse> {
    return this.service.update(user.id, patch);
  }

  @Post('password/set')
  async setPassword(
    @CurrentUser() user: CurrentUserData,
    @Body() body: SetPasswordDto,
    @Req() req: Request,
  ): Promise<{ ok: true }> {
    await this.service.assertCanSetPassword(user.id);
    await auth.api.setPassword({
      body: { newPassword: body.newPassword },
      headers: toHeaders(req.headers),
    });
    await this.service.clearSettingsCache(user.id);
    return { ok: true };
  }
}
