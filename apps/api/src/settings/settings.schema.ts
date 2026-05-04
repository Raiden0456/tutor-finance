import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema, Types } from 'mongoose';
import type { Currency, Locale, Theme } from '@tutor-finance/shared';

@Schema({ collection: 'user_settings', timestamps: true })
export class UserSettings {
  @Prop({ type: MongooseSchema.Types.ObjectId, required: true, unique: true })
  userId!: Types.ObjectId;

  @Prop({ type: String, required: true, default: 'USD' })
  primaryCurrency!: Currency;

  @Prop({ type: String, required: true, default: 'system' })
  theme!: Theme;

  @Prop({ type: String, required: true, default: 'en' })
  locale!: Locale;
}

export type UserSettingsDocument = HydratedDocument<UserSettings>;
export const UserSettingsSchema = SchemaFactory.createForClass(UserSettings);
