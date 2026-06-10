import Constants from 'expo-constants';

const DEFAULT_API_URL = 'http://localhost:3000';

function normalizeBaseUrl(url: string): string {
  return url.replace(/\/+$/, '');
}

// Direct origin of the NestJS API. The native app talks to it directly (no web
// reverse proxy); auth lives under /api/auth, feature routes are at the root.
export const API_URL = normalizeBaseUrl(
  process.env.EXPO_PUBLIC_API_URL ??
    (Constants.expoConfig?.extra?.apiUrl as string | undefined) ??
    DEFAULT_API_URL,
);

// Deep-link scheme registered in app.config.ts; used for OAuth callbacks and
// the Better Auth Expo client. Read from the build's config so app variants
// (dev build = 'uchetka-dev') keep their own scheme and SecureStore prefix.
const configScheme = Constants.expoConfig?.scheme;
export const APP_SCHEME =
  (Array.isArray(configScheme) ? configScheme[0] : configScheme) ?? 'uchetka';
