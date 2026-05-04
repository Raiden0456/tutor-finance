import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { UserSettings, UserSettingsSchema } from './settings.schema.js';
import { SettingsService } from './settings.service.js';
import { SettingsResolver } from './settings.resolver.js';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: UserSettings.name, schema: UserSettingsSchema }]),
  ],
  providers: [SettingsService, SettingsResolver],
  exports: [SettingsService],
})
export class SettingsModule {}
