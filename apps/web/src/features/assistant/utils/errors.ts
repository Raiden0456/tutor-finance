import type { AiErrorCode } from '@tutor-finance/shared';
import { ApiError } from '@/lib/api';

export function aiErrorCode(error: unknown): AiErrorCode | 'RATE_LIMITED' | null {
  if (!(error instanceof ApiError)) return null;
  if (error.status === 429) return 'RATE_LIMITED';
  const body = error.body;
  if (body && typeof body === 'object' && 'code' in body && typeof body.code === 'string') {
    return body.code as AiErrorCode;
  }
  return null;
}

export type VoiceErrorReason = 'denied' | 'no-device' | 'busy' | 'unsupported' | 'no-speech';

export class VoiceError extends Error {
  constructor(public reason: VoiceErrorReason) {
    super(reason);
    this.name = 'VoiceError';
  }
}
