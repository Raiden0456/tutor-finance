import { HttpStatus, Inject, Injectable, Logger } from '@nestjs/common';
import type { AiTranscriptionResponse } from '@tutor-finance/shared';
import { and, eq, isNull } from 'drizzle-orm';
import { env } from '../../config.js';
import type { Database } from '../../db/client.js';
import { DB } from '../../db/db.module.js';
import { students } from '../../db/schema.js';
import { OPENAI_RESOURCE } from '../providers/chatgpt-oauth.client.js';
import { AiError } from '../utils/ai-error.js';
import { AiSettingsService } from './ai-settings.service.js';

export interface UploadedAudio {
  buffer: Buffer;
  mimetype: string;
  originalname: string;
  size: number;
}

export const MAX_AUDIO_BYTES = 25 * 1024 * 1024;
const MAX_KEYWORDS = 100;

@Injectable()
export class AiTranscriptionService {
  private readonly logger = new Logger(AiTranscriptionService.name);

  constructor(
    @Inject(DB) private readonly db: Database,
    private readonly settings: AiSettingsService,
  ) {}

  async transcribe(
    userId: string,
    audio: UploadedAudio | undefined,
  ): Promise<AiTranscriptionResponse> {
    await this.settings.assertConsent(userId);
    const apiKey = env.ai.openaiApiKey;
    if (!apiKey) {
      throw new AiError(
        'AI_TRANSCRIPTION_NOT_CONFIGURED',
        'Voice input needs OPENAI_API_KEY on the server',
        HttpStatus.CONFLICT,
      );
    }
    if (!audio?.size) {
      throw new AiError('AI_TRANSCRIPTION_FAILED', 'No audio received', HttpStatus.BAD_REQUEST);
    }

    const ctx = await this.settings.context(userId);
    const form = new FormData();
    form.append('model', env.ai.transcribeModel);
    form.append(
      'file',
      new Blob([new Uint8Array(audio.buffer)], { type: audio.mimetype }),
      audio.originalname || 'speech.webm',
    );
    for (const language of new Set([
      ctx.aiLanguage === 'auto' ? ctx.locale : ctx.aiLanguage,
      'en',
    ])) {
      form.append('languages[]', language);
    }
    for (const name of await this.studentNames(userId)) {
      form.append('keywords[]', name);
    }

    const res = await fetch(`${OPENAI_RESOURCE}/audio/transcriptions`, {
      method: 'POST',
      headers: { authorization: `Bearer ${apiKey}` },
      body: form,
    });
    if (!res.ok) {
      const body = await res.text();
      this.logger.warn(`Transcription failed ${res.status}: ${body.slice(0, 500)}`);
      throw new AiError(
        'AI_TRANSCRIPTION_FAILED',
        'Could not transcribe the recording',
        res.status === 429 ? HttpStatus.TOO_MANY_REQUESTS : HttpStatus.BAD_GATEWAY,
      );
    }
    const json = (await res.json()) as { text?: string };
    return { text: (json.text ?? '').trim() };
  }

  private async studentNames(userId: string): Promise<string[]> {
    const rows = await this.db
      .select({ name: students.name })
      .from(students)
      .where(and(eq(students.userId, userId), isNull(students.archivedAt)))
      .limit(MAX_KEYWORDS);
    return rows.map((r) => r.name);
  }
}
