import * as React from 'react';
import type { Currency, WeekStartsOn } from '@tutor-finance/shared';
import { api } from '~/lib/api';
import { authClient } from '~/lib/auth-client';
import type { Settings } from '~/lib/types';

type SettingsContextValue = {
  settings: Settings | null;
  loading: boolean;
  refresh: () => Promise<void>;
  update: (
    patch: Partial<
      Pick<
        Settings,
        'primaryCurrency' | 'theme' | 'locale' | 'weekStartsOn' | 'lessonReminderMinutes'
      >
    >,
  ) => Promise<void>;
  /** Convenience accessors with sensible fallbacks. */
  primaryCurrency: Currency;
  weekStartsOn: WeekStartsOn;
};

const SettingsContext = React.createContext<SettingsContextValue | null>(null);

export function useSettings() {
  const ctx = React.useContext(SettingsContext);
  if (!ctx) throw new Error('useSettings must be used within <SettingsProvider>');
  return ctx;
}

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const { data: session } = authClient.useSession();
  const userId = session?.user?.id;
  const [settings, setSettings] = React.useState<Settings | null>(null);
  const [loading, setLoading] = React.useState(false);

  // NOTE: theme & locale are device-local prefs owned by ThemePrefProvider /
  // I18nProvider (persisted in SecureStore) and only pushed to the server on
  // save. We intentionally do NOT re-apply the server's theme/locale here —
  // useSession emits a fresh object frequently, and re-applying on every emit
  // would clobber the user's just-made local toggle (the "snaps back" bug).
  const refresh = React.useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.get<Settings>('settings/me');
      setSettings(data);
    } catch {
      // leave previous settings in place
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    if (userId) void refresh();
    else setSettings(null);
  }, [userId, refresh]);

  const update = React.useCallback<SettingsContextValue['update']>(async (patch) => {
    const data = await api.patch<Settings>('settings/me', patch);
    setSettings(data);
  }, []);

  const value = React.useMemo<SettingsContextValue>(
    () => ({
      settings,
      loading,
      refresh,
      update,
      primaryCurrency: settings?.primaryCurrency ?? 'USD',
      weekStartsOn: settings?.weekStartsOn ?? 1,
    }),
    [settings, loading, refresh, update],
  );

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}
