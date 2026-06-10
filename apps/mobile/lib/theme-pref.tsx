import * as React from 'react';
import { useColorScheme as useNativewindColorScheme } from 'nativewind';
import type { Theme } from '@tutor-finance/shared';
import { storage, STORAGE_KEYS } from '~/lib/storage';

type ThemePrefContextValue = {
  /** The user's preference: 'light' | 'dark' | 'system'. */
  theme: Theme;
  setTheme: (theme: Theme) => void;
};

const ThemePrefContext = React.createContext<ThemePrefContextValue>({
  theme: 'system',
  setTheme: () => {},
});

export function useThemePref() {
  return React.useContext(ThemePrefContext);
}

export function ThemePrefProvider({ children }: { children: React.ReactNode }) {
  const { setColorScheme } = useNativewindColorScheme();
  const [theme, setThemeState] = React.useState<Theme>('system');

  React.useEffect(() => {
    void storage.get(STORAGE_KEYS.theme).then((stored) => {
      if (stored === 'light' || stored === 'dark' || stored === 'system') {
        setThemeState(stored);
        setColorScheme(stored);
      }
    });
  }, [setColorScheme]);

  const setTheme = React.useCallback(
    (next: Theme) => {
      setThemeState(next);
      setColorScheme(next);
      void storage.set(STORAGE_KEYS.theme, next);
    },
    [setColorScheme],
  );

  const value = React.useMemo<ThemePrefContextValue>(() => ({ theme, setTheme }), [theme, setTheme]);

  return <ThemePrefContext.Provider value={value}>{children}</ThemePrefContext.Provider>;
}
