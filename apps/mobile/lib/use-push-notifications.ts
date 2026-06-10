import * as React from 'react';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { useRouter } from 'expo-router';
import { api } from '~/lib/api';

const IS_EXPO_GO = Constants.appOwnership === 'expo';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

async function registerForPushNotificationsAsync(): Promise<string | null> {
  if (!Device.isDevice || IS_EXPO_GO) {
    console.warn('[push] skipped: not a physical device or running in Expo Go');
    return null;
  }

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('reminders', {
      name: 'Lesson reminders',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#f97316',
    });
  }

  const existing = await Notifications.getPermissionsAsync();
  let status = existing.status;
  if (status !== 'granted') {
    status = (await Notifications.requestPermissionsAsync()).status;
  }
  if (status !== 'granted') {
    console.warn('[push] skipped: notification permission not granted');
    return null;
  }

  const projectId =
    Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId ?? undefined;
  if (!projectId) {
    console.warn('[push] skipped: no EAS projectId (set EXPO_PUBLIC_EAS_PROJECT_ID)');
    return null;
  }

  // NOTE: on Android this requires FCM in the BUILD (google-services.json via
  // android.googleServicesFile) — without it the native call throws.
  const token = await Notifications.getExpoPushTokenAsync({ projectId });
  return token.data;
}

/**
 * Registers the Expo push token with the API (replacing the old WebView
 * postMessage bridge) and deep-links to the screen referenced by a tapped
 * notification's `path` payload.
 */
export function usePushNotifications(authenticated: boolean) {
  const router = useRouter();

  // Register token once authenticated.
  React.useEffect(() => {
    if (!authenticated) return;
    let cancelled = false;
    registerForPushNotificationsAsync()
      .then((token) => {
        if (cancelled || !token) return;
        const platform = Platform.OS === 'ios' || Platform.OS === 'android' ? Platform.OS : undefined;
        void api
          .post('device-tokens', { token, platform })
          .then(() => console.log('[push] token registered with API'))
          .catch((e) => console.warn('[push] token registration with API failed:', e));
      })
      .catch((e) => console.warn('[push] getting push token failed (missing FCM setup?):', e));
    return () => {
      cancelled = true;
    };
  }, [authenticated]);

  // Deep-link on notification tap.
  React.useEffect(() => {
    const goToPath = (path: unknown) => {
      if (typeof path === 'string' && path.startsWith('/')) router.push(path as never);
    };

    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      goToPath(response.notification.request.content.data?.path);
    });

    void Notifications.getLastNotificationResponseAsync().then((response) => {
      goToPath(response?.notification.request.content.data?.path);
    });

    return () => sub.remove();
  }, [router]);
}
