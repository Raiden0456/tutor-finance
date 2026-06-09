import { useColorScheme as useNativewindColorScheme } from 'nativewind';
import { THEME } from '~/lib/theme';

/**
 * Wraps NativeWind's color scheme hook and also exposes the active raw color
 * palette (for charts, StatusBar, placeholderTextColor, etc.).
 */
export function useColorScheme() {
  const { colorScheme, setColorScheme, toggleColorScheme } = useNativewindColorScheme();
  const scheme = colorScheme ?? 'light';
  return {
    colorScheme: scheme,
    isDarkColorScheme: scheme === 'dark',
    setColorScheme,
    toggleColorScheme,
    colors: THEME[scheme],
  };
}
