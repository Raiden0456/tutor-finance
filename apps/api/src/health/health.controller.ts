import { Controller, Get } from '@nestjs/common';
import { Public } from '@thallesp/nestjs-better-auth';

@Controller('health')
export class HealthController {
  @Get()
  @Public()
  health(): { status: string } {
    return { status: 'ok' };
  }
}
