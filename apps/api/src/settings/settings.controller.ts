import { Body, Controller, Get, Patch } from '@nestjs/common';
import { CurrentUser, type CurrentUserData } from '../auth/current-user.decorator.js';
import { SettingsService } from './settings.service.js';
import { UpdateSettingsDto, type SettingsResponse } from './settings.dto.js';

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
}
