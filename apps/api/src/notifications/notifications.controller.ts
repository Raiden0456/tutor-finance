import { Body, Controller, Post } from '@nestjs/common';
import { CurrentUser, type CurrentUserData } from '../auth/current-user.decorator.js';
import {
  RegisterDeviceTokenDto,
  type RegisterDeviceTokenResponse,
} from './notifications.dto.js';
import { NotificationsService } from './notifications.service.js';

@Controller('device-tokens')
export class NotificationsController {
  constructor(private readonly service: NotificationsService) {}

  @Post()
  register(
    @CurrentUser() user: CurrentUserData,
    @Body() input: RegisterDeviceTokenDto,
  ): Promise<RegisterDeviceTokenResponse> {
    return this.service.registerDeviceToken(user.id, input);
  }
}
