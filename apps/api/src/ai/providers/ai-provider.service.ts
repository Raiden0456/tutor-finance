import { HttpStatus, Injectable } from '@nestjs/common';
import type { AiProviderKind } from '@tutor-finance/shared';
import { env } from '../../config.js';
import { ChatgptConnectionService } from '../services/chatgpt-connection.service.js';
import { AiError } from '../utils/ai-error.js';

export interface ResolvedProvider {
  kind: AiProviderKind;
  token: string;
}

@Injectable()
export class AiProviderService {
  constructor(private readonly chatgpt: ChatgptConnectionService) {}

  async activeKind(userId: string): Promise<AiProviderKind | null> {
    if (this.chatgpt.available && this.chatgpt.isConnected(await this.chatgpt.findRow(userId))) {
      return 'chatgpt';
    }
    return env.ai.openaiApiKey ? 'api_key' : null;
  }

  async resolve(userId: string): Promise<ResolvedProvider> {
    const kind = await this.activeKind(userId);
    if (kind === 'chatgpt') return { kind, token: await this.chatgpt.getAccessToken(userId) };
    if (kind === 'api_key') return { kind, token: env.ai.openaiApiKey };
    throw new AiError(
      'AI_NOT_CONFIGURED',
      'Connect ChatGPT or set OPENAI_API_KEY to use the assistant',
      HttpStatus.CONFLICT,
    );
  }
}
