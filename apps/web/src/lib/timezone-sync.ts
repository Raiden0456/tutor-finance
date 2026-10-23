import { detectTimeZone } from '@tutor-finance/shared';
import { api } from './api';
import type { Settings } from './types';

const SYNCED_KEY = 'tutor-finance:timezone-synced';

let pending: Promise<string | null> | null = null;

export function syncTimeZone(): Promise<string | null> {
  pending ??= patchDetectedTimeZone().catch((error: unknown) => {
    pending = null;
    throw error;
  });
  return pending;
}

async function patchDetectedTimeZone(): Promise<string | null> {
  const detected = detectTimeZone();
  if (!detected || sessionStorage.getItem(SYNCED_KEY) === detected) return null;
  const res = await api.patch<Settings>('/settings/me', { timezone: detected });
  sessionStorage.setItem(SYNCED_KEY, res.timezone);
  return res.timezone;
}
