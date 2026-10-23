import { Inject, Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { zonedParts } from '@tutor-finance/shared';
import { and, eq, isNotNull } from 'drizzle-orm';
import { env } from '../../config.js';
import type { Database } from '../../db/client.js';
import { DB } from '../../db/db.module.js';
import { aiDigests, userSettings } from '../../db/schema.js';
import { localDateKey } from '../tools/tool-format.js';
import { AiError } from '../utils/ai-error.js';
import { AiAgentService } from './ai-agent.service.js';

@Injectable()
export class AiDigestSchedulerService {
  private readonly logger = new Logger(AiDigestSchedulerService.name);

  constructor(
    @Inject(DB) private readonly db: Database,
    private readonly agent: AiAgentService,
  ) {}

  @Cron('5 * * * *')
  async generateMorningDigests(): Promise<void> {
    const now = new Date();
    const rows = await this.db
      .select({ userId: userSettings.userId, timeZone: userSettings.timezone })
      .from(userSettings)
      .where(isNotNull(userSettings.aiConsentAt));

    for (const row of rows) {
      if (zonedParts(now, row.timeZone).hour !== env.ai.digestHour) continue;
      const localDate = localDateKey(row, now);
      const [existing] = await this.db
        .select({ id: aiDigests.id })
        .from(aiDigests)
        .where(and(eq(aiDigests.userId, row.userId), eq(aiDigests.localDate, localDate)))
        .limit(1);
      if (existing) continue;
      try {
        await this.agent.generateDigest(row.userId);
      } catch (err) {
        if (err instanceof AiError && err.code === 'AI_NOT_CONFIGURED') continue;
        this.logger.warn(`Morning digest failed for ${row.userId}: ${(err as Error).message}`);
      }
    }
  }
}
