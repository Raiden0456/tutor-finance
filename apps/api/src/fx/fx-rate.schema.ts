import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

@Schema({ collection: 'fx_rates', timestamps: true })
export class FxRate {
  @Prop({ type: String, required: true, index: true })
  base!: string;

  @Prop({ type: String, required: true, index: true })
  quote!: string;

  @Prop({ type: Number, required: true })
  rate!: number;

  @Prop({ type: Date, required: true })
  fetchedAt!: Date;
}

export type FxRateDocument = HydratedDocument<FxRate>;
export const FxRateSchema = SchemaFactory.createForClass(FxRate);
FxRateSchema.index({ base: 1, quote: 1, fetchedAt: -1 });
