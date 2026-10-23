import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import type { AiStatusResponse } from '@tutor-finance/shared';
import { env } from '../../config.js';
import { DB } from '../../db/db.module.js';
import type { Database } from '../../db/client.js';
import { userSettings } from '../../db/schema.js';
import { SettingsService } from '../../settings/settings.service.js';
import { AiProviderService } from '../providers/ai-provider.service.js';
import type { ToolContext } from '../tools/tool-format.js';
import { AiError } from '../utils/ai-error.js';
import { ChatgptConnectionService } from './chatgpt-connection.service.js';

@Injectable()
export class AiSettingsService {
  constructor(
    @Inject(DB) private readonly db: Database,
    private readonly settings: SettingsService,
    private readonly chatgpt: ChatgptConnectionService,
    private readonly providers: AiProviderService,
  ) {}

  async status(userId: string): Promise<AiStatusResponse> {
    const [row, consentGiven, activeProvider] = await Promise.all([
      this.chatgpt.findRow(userId),
      this.hasConsent(userId),
      this.providers.activeKind(userId),
    ]);
    const connected = this.chatgpt.available && this.chatgpt.isConnected(row);
    return {
      providers: {
        chatgpt: {
          available: this.chatgpt.available,
          connected,
          ...(connected && row?.accountEmail ? { email: row.accountEmail } : {}),
        },
        apiKey: { available: !!env.ai.openaiApiKey },
      },
      activeProvider,
      consentGiven,
      ready: consentGiven && activeProvider !== null,
      transcription: { available: !!env.ai.openaiApiKey },
    };
  }

  async hasConsent(userId: string): Promise<boolean> {
    const [row] = await this.db
      .select({ aiConsentAt: userSettings.aiConsentAt })
      .from(userSettings)
      .where(eq(userSettings.userId, userId))
      .limit(1);
    return !!row?.aiConsentAt;
  }

  async assertConsent(userId: string): Promise<void> {
    if (!(await this.hasConsent(userId))) {
      throw new AiError(
        'AI_CONSENT_REQUIRED',
        'Allow the AI assistant to access your data first',
        HttpStatus.FORBIDDEN,
      );
    }
  }

  async setConsent(userId: string, given: boolean): Promise<void> {
    const aiConsentAt = given ? new Date() : null;
    await this.db
      .insert(userSettings)
      .values({ userId, aiConsentAt })
      .onConflictDoUpdate({ target: userSettings.userId, set: { aiConsentAt } });
  }

  async context(userId: string, threadId?: string): Promise<ToolContext> {
    const s = await this.settings.getOrCreate(userId);
    return {
      userId,
      timeZone: s.timezone,
      locale: s.locale,
      aiLanguage: s.aiLanguage,
      primaryCurrency: s.primaryCurrency,
      threadId,
    };
  }
}
