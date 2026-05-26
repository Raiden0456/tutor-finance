import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { LoggerMiddleware } from './logger.middleware.js';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { AuthModule } from '@thallesp/nestjs-better-auth';
import { auth } from './auth/auth.provider.js';
import { RedisCacheModule } from './cache/redis-cache.module.js';
import { DbModule } from './db/db.module.js';
import { StudentsModule } from './students/students.module.js';
import { LessonsModule } from './lessons/lessons.module.js';
import { TransactionsModule } from './transactions/transactions.module.js';
import { FxModule } from './fx/fx.module.js';
import { SettingsModule } from './settings/settings.module.js';
import { DashboardModule } from './dashboard/dashboard.module.js';
import { HealthModule } from './health/health.module.js';
import { RecurringModule } from './recurring/recurring.module.js';
import { RecurringLessonsModule } from './recurring-lessons/recurring-lessons.module.js';
import { NotificationsModule } from './notifications/notifications.module.js';

@Module({
  imports: [
    DbModule,
    RedisCacheModule,
    ScheduleModule.forRoot(),
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 200 }]),
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
    RecurringModule,
    RecurringLessonsModule,
    NotificationsModule,
  ],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(LoggerMiddleware).forRoutes('*');
  }
}
