import { Module } from '@nestjs/common';
import { FxService } from './fx.service.js';
import { FxController } from './fx.controller.js';

@Module({
  controllers: [FxController],
  providers: [FxService],
  exports: [FxService],
})
export class FxModule {}
