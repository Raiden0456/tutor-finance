import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { AuthModule } from '@thallesp/nestjs-better-auth';
import { auth } from './auth/auth.provider.js';
import { DbModule } from './db/db.module.js';
import { StudentsModule } from './students/students.module.js';
import { LessonsModule } from './lessons/lessons.module.js';
import { TransactionsModule } from './transactions/transactions.module.js';
import { FxModule } from './fx/fx.module.js';
import { SettingsModule } from './settings/settings.module.js';
import { DashboardModule } from './dashboard/dashboard.module.js';
import { HealthModule } from './health/health.module.js';

@Module({
  imports: [
    DbModule,
    ScheduleModule.forRoot(),
    AuthModule.forRoot({
      auth,
      bodyParser: {
        json: { limit: '2mb' },
        urlencoded: { enabled: true, extended: true, limit: '2mb' },
      },
    }),
    StudentsModule,
    LessonsModule,
    TransactionsModule,
    FxModule,
    SettingsModule,
    DashboardModule,
    HealthModule,
  ],
})
export class AppModule {}
