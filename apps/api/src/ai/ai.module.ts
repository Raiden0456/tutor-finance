import { Module } from '@nestjs/common';
import { FxModule } from '../fx/fx.module.js';
import { GoogleCalendarModule } from '../google-calendar/google-calendar.module.js';
import { LessonsModule } from '../lessons/lessons.module.js';
import { NotificationsModule } from '../notifications/notifications.module.js';
import { RecurringLessonsModule } from '../recurring-lessons/recurring-lessons.module.js';
import { RecurringModule } from '../recurring/recurring.module.js';
import { SettingsModule } from '../settings/settings.module.js';
import { StudentsModule } from '../students/students.module.js';
import { TransactionsModule } from '../transactions/transactions.module.js';
import { AiThreadsController } from './controllers/ai-threads.controller.js';
import { AiController } from './controllers/ai.controller.js';
import { ChatgptCallbackController } from './controllers/chatgpt-callback.controller.js';
import { ChatgptController } from './controllers/chatgpt.controller.js';
import { AiProviderService } from './providers/ai-provider.service.js';
import { ChatgptOAuthClient } from './providers/chatgpt-oauth.client.js';
import { ResponsesClient } from './providers/responses.client.js';
import { AiActionsService } from './services/ai-actions.service.js';
import { AiAgentService } from './services/ai-agent.service.js';
import { AiDigestSchedulerService } from './services/ai-digest-scheduler.service.js';
import { AiRunsService } from './services/ai-runs.service.js';
import { AiSettingsService } from './services/ai-settings.service.js';
import { AiThreadsService } from './services/ai-threads.service.js';
import { AiTranscriptionService } from './services/ai-transcription.service.js';
import { ChatgptConnectionService } from './services/chatgpt-connection.service.js';
import { ActionRefsService } from './tools/action-refs.service.js';
import { ReadToolsService } from './tools/read-tools.service.js';
import { WriteToolsService } from './tools/write-tools.service.js';

@Module({
  imports: [
    StudentsModule,
    LessonsModule,
    TransactionsModule,
    RecurringLessonsModule,
    RecurringModule,
    SettingsModule,
    FxModule,
    GoogleCalendarModule,
    NotificationsModule,
  ],
  controllers: [AiController, AiThreadsController, ChatgptController, ChatgptCallbackController],
  providers: [
    ChatgptOAuthClient,
    ResponsesClient,
    AiProviderService,
    ChatgptConnectionService,
    AiSettingsService,
    AiThreadsService,
    AiActionsService,
    AiAgentService,
    AiRunsService,
    AiDigestSchedulerService,
    AiTranscriptionService,
    ActionRefsService,
    ReadToolsService,
    WriteToolsService,
  ],
})
export class AiModule {}
