import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { FxRate, FxRateSchema } from './fx-rate.schema.js';
import { FxService } from './fx.service.js';
import { FxResolver } from './fx.resolver.js';

@Module({
  imports: [MongooseModule.forFeature([{ name: FxRate.name, schema: FxRateSchema }])],
  providers: [FxService, FxResolver],
  exports: [FxService],
})
export class FxModule {}
