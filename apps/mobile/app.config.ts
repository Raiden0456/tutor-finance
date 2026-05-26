import type { ExpoConfig } from 'expo/config';

const config: ExpoConfig = {
  name: 'Uchetka',
  slug: 'uchetka-mobile',
  version: '0.0.1',
  platforms: ['ios', 'android'],
  orientation: 'portrait',
  scheme: 'uchetka',
  userInterfaceStyle: 'automatic',
  plugins: [
    'expo-notifications',
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
  },
  android: {
    package: 'com.tutorfinance.uchetka',
  },
  extra: {
    webAppUrl: process.env.EXPO_PUBLIC_WEB_APP_URL,
    eas: {
      projectId: process.env.EXPO_PUBLIC_EAS_PROJECT_ID,
    },
  },
};

export default config;
