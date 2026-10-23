import { useEffect } from 'react';
import type { Locale } from '@/lib/i18n';
import { syncClientSettings } from '@/lib/settings-sync';

export function SettingsSync({ locale }: { locale: Locale }) {
  useEffect(() => {
    syncClientSettings(locale).catch((error: unknown) =>
      console.warn('Failed to sync settings', error),
    );
  }, [locale]);

  return null;
}
