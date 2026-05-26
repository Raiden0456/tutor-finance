import { Module } from '@nestjs/common';
import { RecurringLessonsController } from './recurring-lessons.controller.js';
import { RecurringLessonsService } from './recurring-lessons.service.js';
import { GoogleCalendarModule } from '../google-calendar/google-calendar.module.js';

@Module({
  imports: [GoogleCalendarModule],
  controllers: [RecurringLessonsController],
  providers: [RecurringLessonsService],
})
export class RecurringLessonsModule {}
