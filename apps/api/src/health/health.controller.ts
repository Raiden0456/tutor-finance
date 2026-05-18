import { Controller, Get } from '@nestjs/common';
import { Public } from '@thallesp/nestjs-better-auth';
import { SkipThrottle } from '@nestjs/throttler';

@SkipThrottle()
@Controller('health')
export class HealthController {
  @Get()
  @Public()
  health(): { status: string } {
    return { status: 'ok' };
  }
}
