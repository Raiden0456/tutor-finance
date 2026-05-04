import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema, Types } from 'mongoose';
import type { Currency } from '@tutor-finance/shared';

@Schema({ _id: false })
export class MoneyEmbed {
  @Prop({ type: Number, required: true })
  amount!: number;

  @Prop({ type: String, required: true })
  currency!: Currency;
}
const MoneyEmbedSchema = SchemaFactory.createForClass(MoneyEmbed);

@Schema({ collection: 'students', timestamps: true })
export class Student {
  @Prop({ type: MongooseSchema.Types.ObjectId, required: true, index: true })
  userId!: Types.ObjectId;

  @Prop({ type: String, required: true })
  name!: string;

  @Prop({ type: String })
  email?: string;

  @Prop({ type: String })
  phone?: string;

  @Prop({ type: MoneyEmbedSchema, required: true })
  hourlyRate!: MoneyEmbed;

  @Prop({ type: String, required: true })
  defaultCurrency!: Currency;

  @Prop({ type: String })
  notes?: string;

  @Prop({ type: Date })
  archivedAt?: Date;
}

export type StudentDocument = HydratedDocument<Student>;
export const StudentSchema = SchemaFactory.createForClass(Student);
StudentSchema.index({ userId: 1, name: 1 });
