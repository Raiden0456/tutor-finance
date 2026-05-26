import { Module } from '@nestjs/common';
import { GoogleCalendarController } from './google-calendar.controller.js';
import { GoogleCalendarService } from './google-calendar.service.js';

@Module({
  controllers: [GoogleCalendarController],
  providers: [GoogleCalendarService],
  exports: [GoogleCalendarService],
})
export class GoogleCalendarModule {}
