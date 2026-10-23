import type { AiErrorCode } from '@tutor-finance/shared';
import { ApiError, isUnauthorized } from '~/lib/api';
import { requestConsent } from '~/lib/ai/consent';
import { refreshAiStatus } from '~/lib/ai/status';
import type { TFunction } from '~/lib/i18n';
import { toast } from '~/lib/toast';

export const SETUP_CODES: AiErrorCode[] = ['AI_NOT_CONFIGURED', 'AI_RECONNECT_REQUIRED'];

export function aiErrorCode(e: unknown): AiErrorCode | null {
  if (!(e instanceof ApiError) || !e.body || typeof e.body !== 'object') return null;
  const code = (e.body as { code?: unknown }).code;
  return typeof code === 'string' ? (code as AiErrorCode) : null;
}

export function handleAiError(
  code: AiErrorCode | null,
  message: string | null,
  t: TFunction,
  status?: number,
) {
  if (code === 'AI_CONSENT_REQUIRED') {
    void refreshAiStatus().catch(() => undefined);
    void requestConsent();
    return;
  }
  if (code && SETUP_CODES.includes(code)) {
    void refreshAiStatus().catch(() => undefined);
    return;
  }
  if (code === 'AI_RUN_IN_PROGRESS') {
    toast.error(t('The assistant is still answering. Wait for it to finish.'));
    return;
  }
  if (status === 429 || code === 'AI_USAGE_LIMIT') {
    toast.error(message || t('Too many requests. Try again in a minute.'));
    return;
  }
  toast.error(message || t('Something went wrong'));
}

export function handleAiException(e: unknown, t: TFunction): AiErrorCode | null {
  if (isUnauthorized(e)) return null;
  const code = aiErrorCode(e);
  handleAiError(
    code,
    e instanceof Error ? e.message : null,
    t,
    e instanceof ApiError ? e.status : undefined,
  );
  return code;
}
