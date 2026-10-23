import { Module } from '@nestjs/common';
import { StudentsService } from './students.service.js';
import { StudentsController } from './students.controller.js';
import { TransactionsModule } from '../transactions/transactions.module.js';
import { FxModule } from '../fx/fx.module.js';

@Module({
  imports: [TransactionsModule, FxModule],
  controllers: [StudentsController],
  providers: [StudentsService],
  exports: [StudentsService],
})
export class StudentsModule {}
