import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema, Types } from 'mongoose';
import type { Currency, LessonStatus as LessonStatusType } from '@tutor-finance/shared';

@Schema({ _id: false })
export class LessonPriceOverride {
  @Prop({ type: Number, required: true })
  amount!: number;

  @Prop({ type: String, required: true })
  currency!: Currency;
}
const LessonPriceOverrideSchema = SchemaFactory.createForClass(LessonPriceOverride);

@Schema({ collection: 'lessons', timestamps: true })
export class Lesson {
  @Prop({ type: MongooseSchema.Types.ObjectId, required: true, index: true })
  userId!: Types.ObjectId;

  @Prop({ type: MongooseSchema.Types.ObjectId, required: true, index: true })
  studentId!: Types.ObjectId;

  @Prop({ type: Date, required: true })
  startsAt!: Date;

  @Prop({ type: Number, required: true })
  durationMin!: number;

  @Prop({ type: String, required: true, enum: ['scheduled', 'completed', 'cancelled', 'no_show'] })
  status!: LessonStatusType;

  @Prop({ type: LessonPriceOverrideSchema })
  priceOverride?: LessonPriceOverride;

  @Prop({ type: String })
  notes?: string;
}

export type LessonDocument = HydratedDocument<Lesson>;
export const LessonSchema = SchemaFactory.createForClass(Lesson);
LessonSchema.index({ userId: 1, startsAt: -1 });
