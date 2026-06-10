import type { ExpoConfig } from 'expo/config';

const EAS_PROJECT_ID =
  process.env.EXPO_PUBLIC_EAS_PROJECT_ID ?? '665d0277-0ce2-4824-8813-3ff706bc41ea';

// App variants: APP_VARIANT=development produces a separately-installable
// "Uchetka (Dev Build)" app (own package id + scheme) so it can live next to
// the preview/production app on the same device. Set via eas.json build env;
// keep APP_VARIANT=development in apps/mobile/.env so local Metro matches.
const IS_DEV_VARIANT = process.env.APP_VARIANT === 'development';
const APP_NAME = IS_DEV_VARIANT ? 'Uchetka (Dev Build)' : 'Uchetka';
const APP_ID = IS_DEV_VARIANT ? 'com.tutorfinance.uchetka.dev' : 'com.tutorfinance.uchetka';
const APP_SCHEME = IS_DEV_VARIANT ? 'uchetka-dev' : 'uchetka';

// Android push (FCM) config: required for getExpoPushTokenAsync on Android.
// Locally: download google-services.json from the Firebase console into this
// directory (gitignored) and set GOOGLE_SERVICES_JSON=./google-services.json
// in apps/mobile/.env. On EAS: create a "file" environment variable with the
// same name (Expo's documented pattern).
const GOOGLE_SERVICES_FILE = process.env.GOOGLE_SERVICES_JSON;

const config: ExpoConfig = {
  name: APP_NAME,
  slug: 'uchetka-mobile',
  owner: 'raiden0456',
  version: '0.0.1',
  platforms: ['ios', 'android'],
  orientation: 'portrait',
  scheme: APP_SCHEME,
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
    bundleIdentifier: APP_ID,
    icon: {
      light: './assets/icon-light.png',
      dark: './assets/icon-dark.png',
      tinted: './assets/icon-tinted.png',
    },
  },
  android: {
    package: APP_ID,
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
