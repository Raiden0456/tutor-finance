import { DefaultTheme, DarkTheme, type Theme } from '@react-navigation/native';

// Raw color values mirroring apps/web/src/styles/globals.css. Stored as HEX
// (not CSS hsl strings) because Skia / victory-native and React Navigation
// parse hex reliably — space-separated `hsl(H S% L%)` is NOT parsed by Skia and
// renders black. NativeWind className colors come from global.css separately.
export const THEME = {
  light: {
    background: '#fafaf9',
    foreground: '#1a1834',
    card: '#ffffff',
    cardForeground: '#1a1834',
    primary: '#2d2a60',
    primaryForeground: '#ffffff',
    secondary: '#eeedf7',
    secondaryForeground: '#2d2a60',
    muted: '#f5f5fa',
    mutedForeground: '#6868a1',
    accent: '#e9e8f3',
    border: '#e9e8f3',
    input: '#e9e8f3',
    destructive: '#ff7857',
    ring: '#14b8a5',
    income: '#21c45d',
    expense: '#ff7857',
    net: '#14b8a5',
    indigo: '#2d2a60',
    teal: '#14b8a5',
    coral: '#ff7857',
    pollen: '#ffcf57',
    jade: '#21c45d',
  },
  dark: {
    background: '#111113',
    foreground: '#f4f4f5',
    card: '#1b1b1d',
    cardForeground: '#f4f4f5',
    primary: '#14b8a5',
    primaryForeground: '#071311',
    secondary: '#242428',
    secondaryForeground: '#f4f4f5',
    muted: '#18181b',
    mutedForeground: '#a1a1aa',
    accent: '#29292e',
    border: '#29292e',
    input: '#29292e',
    destructive: '#ff7857',
    ring: '#14b8a5',
    income: '#21c45d',
    expense: '#ff7857',
    net: '#14b8a5',
    indigo: '#8e8aff',
    teal: '#14b8a5',
    coral: '#ff7857',
    pollen: '#ffcf57',
    jade: '#21c45d',
  },
} as const;

export const NAV_THEME: Record<'light' | 'dark', Theme> = {
  light: {
    ...DefaultTheme,
    colors: {
      ...DefaultTheme.colors,
      background: THEME.light.background,
      card: THEME.light.card,
      text: THEME.light.foreground,
      border: THEME.light.border,
      primary: THEME.light.primary,
      notification: THEME.light.destructive,
    },
  },
  dark: {
    ...DarkTheme,
    colors: {
      ...DarkTheme.colors,
      background: THEME.dark.background,
      card: THEME.dark.card,
      text: THEME.dark.foreground,
      border: THEME.dark.border,
      primary: THEME.dark.primary,
      notification: THEME.dark.destructive,
    },
  },
};
