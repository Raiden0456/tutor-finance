import { Body, Controller, Get, Post } from '@nestjs/common';
import { CurrentUser, type CurrentUserData } from '../auth/current-user.decorator.js';
import type {
  CalendarConnectResponse,
  CalendarConnectionStatus,
  CalendarDisconnectDto,
  CalendarDisconnectResponse,
  CalendarSyncResponse,
} from './google-calendar.dto.js';
import { GoogleCalendarService } from './google-calendar.service.js';

@Controller('google-calendar')
export class GoogleCalendarController {
  constructor(private readonly service: GoogleCalendarService) {}

  @Get('status')
  status(@CurrentUser() user: CurrentUserData): Promise<CalendarConnectionStatus> {
    return this.service.getStatus(user.id);
  }

  @Post('connect')
  connect(@CurrentUser() user: CurrentUserData): Promise<CalendarConnectResponse> {
    return this.service.connect(user.id);
  }

  @Post('sync')
  sync(@CurrentUser() user: CurrentUserData): Promise<CalendarSyncResponse> {
    return this.service.syncNow(user.id);
  }

  @Post('disconnect')
  disconnect(
    @CurrentUser() user: CurrentUserData,
    @Body() body: CalendarDisconnectDto,
  ): Promise<CalendarDisconnectResponse> {
    return this.service.disconnect(user.id, {
      deleteRemoteCalendar: body?.deleteRemoteCalendar ?? false,
    });
  }
}
