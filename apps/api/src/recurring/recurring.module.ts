import { Module } from '@nestjs/common';
import { RecurringService } from './recurring.service.js';
import { RecurringController } from './recurring.controller.js';

@Module({
  controllers: [RecurringController],
  providers: [RecurringService],
})
export class RecurringModule {}
