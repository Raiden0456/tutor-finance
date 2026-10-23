import { Injectable, NotFoundException, type CanActivate } from '@nestjs/common';
import { env } from '../../config.js';

@Injectable()
export class ChatgptEnabledGuard implements CanActivate {
  canActivate(): boolean {
    if (!env.ai.chatgpt.enabled) throw new NotFoundException();
    return true;
  }
}
