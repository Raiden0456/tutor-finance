import { Module } from '@nestjs/common';
import { DashboardResolver } from './dashboard.resolver.js';
import { TransactionsModule } from '../transactions/transactions.module.js';
import { FxModule } from '../fx/fx.module.js';
import { SettingsModule } from '../settings/settings.module.js';

@Module({
  imports: [TransactionsModule, FxModule, SettingsModule],
  providers: [DashboardResolver],
})
export class DashboardModule {}
