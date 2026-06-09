import * as React from 'react';
import type { Currency, WeekStartsOn } from '@tutor-finance/shared';
import { api } from '~/lib/api';
import { authClient } from '~/lib/auth-client';
import type { Settings } from '~/lib/types';
import { useI18n, normalizeLocale } from '~/lib/i18n';
import { useThemePref } from '~/lib/theme-pref';

type SettingsContextValue = {
  settings: Settings | null;
  loading: boolean;
  refresh: () => Promise<void>;
  update: (patch: Partial<Pick<Settings, 'primaryCurrency' | 'theme' | 'locale' | 'weekStartsOn'>>) => Promise<void>;
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
  const { setLocale } = useI18n();
  const { setTheme } = useThemePref();
  const [settings, setSettings] = React.useState<Settings | null>(null);
  const [loading, setLoading] = React.useState(false);

  const applyServerPrefs = React.useCallback(
    (next: Settings) => {
      setLocale(normalizeLocale(next.locale));
      if (next.theme === 'light' || next.theme === 'dark' || next.theme === 'system') {
        setTheme(next.theme);
      }
    },
    [setLocale, setTheme],
  );

  const refresh = React.useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.get<Settings>('settings/me');
      setSettings(data);
      applyServerPrefs(data);
    } catch {
      // leave previous settings in place
    } finally {
      setLoading(false);
    }
  }, [applyServerPrefs]);

  React.useEffect(() => {
    if (session?.user) void refresh();
    else setSettings(null);
  }, [session?.user, refresh]);

  const update = React.useCallback<SettingsContextValue['update']>(
    async (patch) => {
      const data = await api.patch<Settings>('settings/me', patch);
      setSettings(data);
      applyServerPrefs(data);
    },
    [applyServerPrefs],
  );

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
