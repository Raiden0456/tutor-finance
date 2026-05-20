import { Module } from '@nestjs/common';
import { RecurringLessonsController } from './recurring-lessons.controller.js';
import { RecurringLessonsService } from './recurring-lessons.service.js';

@Module({
  controllers: [RecurringLessonsController],
  providers: [RecurringLessonsService],
})
export class RecurringLessonsModule {}
