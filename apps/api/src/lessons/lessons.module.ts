import { Module } from '@nestjs/common';
import { LessonsService } from './lessons.service.js';
import { LessonsController } from './lessons.controller.js';
import { GoogleCalendarModule } from '../google-calendar/google-calendar.module.js';
import { TransactionsModule } from '../transactions/transactions.module.js';

@Module({
  imports: [TransactionsModule, GoogleCalendarModule],
  controllers: [LessonsController],
  providers: [LessonsService],
  exports: [LessonsService],
})
export class LessonsModule {}
