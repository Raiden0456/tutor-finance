import type { ExpoConfig } from 'expo/config';

const EAS_PROJECT_ID =
  process.env.EXPO_PUBLIC_EAS_PROJECT_ID ?? '665d0277-0ce2-4824-8813-3ff706bc41ea';

// Android push (FCM) config: required for getExpoPushTokenAsync on Android.
// Locally: download google-services.json from the Firebase console into this
// directory (gitignored) and set GOOGLE_SERVICES_JSON=./google-services.json
// in apps/mobile/.env. On EAS: create a "file" environment variable with the
// same name (Expo's documented pattern).
const GOOGLE_SERVICES_FILE = process.env.GOOGLE_SERVICES_JSON;

const config: ExpoConfig = {
  name: 'Uchetka',
  slug: 'uchetka-mobile',
  owner: 'raiden0456',
  version: '0.0.1',
  platforms: ['ios', 'android'],
  orientation: 'portrait',
  scheme: 'uchetka',
  userInterfaceStyle: 'automatic',
  icon: './assets/icon-light.png',
  newArchEnabled: true,
  plugins: [
    'expo-router',
    'expo-secure-store',
    [
      'expo-notifications',
      {
        icon: './assets/notification-icon.png',
        color: '#2d2a5f',
      },
    ],
    [
      'expo-splash-screen',
      {
        backgroundColor: '#fafaf9',
        image: './assets/splash-light.png',
        imageWidth: 280,
        resizeMode: 'contain',
        dark: {
          backgroundColor: '#111113',
          image: './assets/splash-dark.png',
        },
      },
    ],
  ],
  ios: {
    supportsTablet: false,
    bundleIdentifier: 'com.tutorfinance.uchetka',
    icon: {
      light: './assets/icon-light.png',
      dark: './assets/icon-dark.png',
      tinted: './assets/icon-tinted.png',
    },
  },
  android: {
    package: 'com.tutorfinance.uchetka',
    ...(GOOGLE_SERVICES_FILE ? { googleServicesFile: GOOGLE_SERVICES_FILE } : {}),
    adaptiveIcon: {
      foregroundImage: './assets/adaptive-foreground.png',
      monochromeImage: './assets/adaptive-monochrome.png',
      backgroundColor: '#2d2a5f',
    },
  },
  extra: {
    apiUrl: process.env.EXPO_PUBLIC_API_URL,
    eas: {
      projectId: EAS_PROJECT_ID,
    },
  },
};

export default config;
