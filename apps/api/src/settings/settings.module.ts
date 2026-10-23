import { Module } from '@nestjs/common';
import { SettingsService } from './settings.service.js';
import { SettingsController } from './settings.controller.js';
import { RecurringModule } from '../recurring/recurring.module.js';
import { RecurringLessonsModule } from '../recurring-lessons/recurring-lessons.module.js';

@Module({
  imports: [RecurringModule, RecurringLessonsModule],
  controllers: [SettingsController],
  providers: [SettingsService],
  exports: [SettingsService],
})
export class SettingsModule {}
