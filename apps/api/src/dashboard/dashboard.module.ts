import { Module } from '@nestjs/common';
import { DashboardController } from './dashboard.controller.js';
import { TransactionsModule } from '../transactions/transactions.module.js';
import { FxModule } from '../fx/fx.module.js';
import { SettingsModule } from '../settings/settings.module.js';
import { LessonsModule } from '../lessons/lessons.module.js';

@Module({
  imports: [TransactionsModule, FxModule, SettingsModule, LessonsModule],
  controllers: [DashboardController],
})
export class DashboardModule {}
