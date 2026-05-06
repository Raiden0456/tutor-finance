import { Module } from '@nestjs/common';
import { DashboardController } from './dashboard.controller.js';
import { TransactionsModule } from '../transactions/transactions.module.js';
import { FxModule } from '../fx/fx.module.js';
import { SettingsModule } from '../settings/settings.module.js';

@Module({
  imports: [TransactionsModule, FxModule, SettingsModule],
  controllers: [DashboardController],
})
export class DashboardModule {}
