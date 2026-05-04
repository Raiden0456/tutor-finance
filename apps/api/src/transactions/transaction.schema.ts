import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema, Types } from 'mongoose';
import type { Currency, TransactionType } from '@tutor-finance/shared';

@Schema({ collection: 'transactions', timestamps: true })
export class Transaction {
  @Prop({ type: MongooseSchema.Types.ObjectId, required: true, index: true })
  userId!: Types.ObjectId;

  @Prop({ type: String, required: true, enum: ['income', 'expense'] })
  type!: TransactionType;

  @Prop({ type: Number, required: true })
  amount!: number;

  @Prop({ type: String, required: true })
  currency!: Currency;

  @Prop({ type: Date, required: true })
  occurredAt!: Date;

  @Prop({ type: String, required: true })
  category!: string;

  @Prop({ type: MongooseSchema.Types.ObjectId })
  studentId?: Types.ObjectId;

  @Prop({ type: MongooseSchema.Types.ObjectId, index: true })
  lessonId?: Types.ObjectId;

  @Prop({ type: String })
  description?: string;
}

export type TransactionDocument = HydratedDocument<Transaction>;
export const TransactionSchema = SchemaFactory.createForClass(Transaction);
TransactionSchema.index({ userId: 1, occurredAt: -1 });
TransactionSchema.index({ userId: 1, lessonId: 1 });
