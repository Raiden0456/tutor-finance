import { detectTimeZone } from '@tutor-finance/shared';
import { api } from './api';
import type { Locale } from './i18n';
import type { Settings } from './types';

const SYNCED_KEY = 'tutor-finance:settings-synced';

let pending: Promise<Settings | null> | null = null;

export function syncClientSettings(locale: Locale): Promise<Settings | null> {
  pending ??= patchClientSettings(locale).catch((error: unknown) => {
    pending = null;
    throw error;
  });
  return pending;
}

async function patchClientSettings(locale: Locale): Promise<Settings | null> {
  const timezone = detectTimeZone();
  const fingerprint = `${timezone ?? ''}|${locale}`;
  if (sessionStorage.getItem(SYNCED_KEY) === fingerprint) return null;
  const res = await api.patch<Settings>('/settings/me', {
    locale,
    ...(timezone ? { timezone } : {}),
  });
  sessionStorage.setItem(SYNCED_KEY, fingerprint);
  return res;
}
