import { Module } from '@nestjs/common';
import { GraphQLModule } from '@nestjs/graphql';
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { MongooseModule } from '@nestjs/mongoose';
import { ScheduleModule } from '@nestjs/schedule';
import { AuthModule } from '@thallesp/nestjs-better-auth';
import { join } from 'node:path';
import { auth } from './auth/auth.provider.js';
import { env } from './config.js';
import { ObjectIdScalar } from './common/object-id.scalar.js';
import './common/enums.js';
import { StudentsModule } from './students/students.module.js';
import { LessonsModule } from './lessons/lessons.module.js';
import { TransactionsModule } from './transactions/transactions.module.js';
import { FxModule } from './fx/fx.module.js';
import { SettingsModule } from './settings/settings.module.js';
import { DashboardModule } from './dashboard/dashboard.module.js';
import { HealthModule } from './health/health.module.js';

@Module({
  imports: [
    MongooseModule.forRoot(env.databaseUrl),
    ScheduleModule.forRoot(),
    AuthModule.forRoot(auth),
    GraphQLModule.forRoot<ApolloDriverConfig>({
      driver: ApolloDriver,
      autoSchemaFile: join(process.cwd(), 'src/schema.gql'),
      sortSchema: true,
      playground: env.nodeEnv !== 'production',
      introspection: true,
      path: '/graphql',
      context: ({ req, res }: { req: unknown; res: unknown }) => ({ req, res }),
    }),
    StudentsModule,
    LessonsModule,
    TransactionsModule,
    FxModule,
    SettingsModule,
    DashboardModule,
    HealthModule,
  ],
  providers: [ObjectIdScalar],
})
export class AppModule {}
