import Constants from 'expo-constants';
import * as Device from 'expo-device';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  BackHandler,
  Linking,
  Platform,
  Pressable,
  StatusBar,
  StyleSheet,
  Text,
  View,
  useColorScheme,
} from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { WebView, type WebViewNavigation, type WebViewMessageEvent } from 'react-native-webview';
import type { WebView as WebViewType } from 'react-native-webview';

const PUSH_TOKEN_MESSAGE = 'tutor-finance:expo-push-token';
const DEFAULT_WEB_APP_URL = 'http://localhost:4321';
const WEB_APP_URL = normalizeBaseUrl(
  process.env.EXPO_PUBLIC_WEB_APP_URL ??
    (Constants.expoConfig?.extra?.webAppUrl as string | undefined) ??
    DEFAULT_WEB_APP_URL,
);
const IS_EXPO_GO = Constants.appOwnership === 'expo';
const NATIVE_SHELL_USER_AGENT = 'TutorFinanceNativeShell/1.0';
const NATIVE_SHELL_INJECTION = `
  window.__TUTOR_FINANCE_NATIVE_SHELL__ = true;
  document.documentElement.setAttribute('data-native-shell', 'true');
  true;
`;

export default function App() {
  return (
    <SafeAreaProvider>
      <MobileShell />
    </SafeAreaProvider>
  );
}

function MobileShell() {
  const webViewRef = useRef<WebViewType>(null);
  const [canGoBack, setCanGoBack] = useState(false);
  const [sourceUrl, setSourceUrl] = useState(WEB_APP_URL);
  const [currentUrl, setCurrentUrl] = useState(WEB_APP_URL);
  const [pushToken, setPushToken] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const systemChromeBackground = colorScheme === 'dark' ? '#000000' : '#ffffff';
  const statusBarStyle = colorScheme === 'dark' ? 'light-content' : 'dark-content';

  const source = useMemo(() => ({ uri: sourceUrl }), [sourceUrl]);

  const postPushTokenToWeb = useCallback((token: string) => {
    const message = JSON.stringify({
      type: PUSH_TOKEN_MESSAGE,
      token,
      platform: Platform.OS === 'ios' || Platform.OS === 'android' ? Platform.OS : undefined,
    });
    webViewRef.current?.postMessage(message);
  }, []);

  const openPath = useCallback((path: string) => {
    const nextUrl = buildWebUrl(path);
    setSourceUrl(nextUrl);
    setCurrentUrl(nextUrl);
    webViewRef.current?.injectJavaScript(
      `window.location.href = ${JSON.stringify(nextUrl)}; true;`,
    );
  }, []);

  useEffect(() => {
    registerForPushNotificationsAsync()
      .then((token) => {
        if (!token) return;
        setPushToken(token);
        postPushTokenToWeb(token);
      })
      .catch((err) => console.warn('Push registration failed', err));
  }, [postPushTokenToWeb]);

  useEffect(() => {
    if (IS_EXPO_GO) return;

    let subscription: { remove: () => void } | undefined;
    let cancelled = false;

    void loadNotifications().then((Notifications) => {
      if (cancelled) return;

      Notifications.setNotificationHandler({
        handleNotification: async () => ({
          shouldPlaySound: true,
          shouldSetBadge: false,
          shouldShowBanner: true,
          shouldShowList: true,
        }),
      });

      subscription = Notifications.addNotificationResponseReceivedListener((response) => {
        const path = response.notification.request.content.data?.path;
        if (typeof path === 'string') openPath(path);
      });

      Notifications.getLastNotificationResponseAsync()
        .then((response) => {
          const path = response?.notification.request.content.data?.path;
          if (typeof path === 'string') openPath(path);
        })
        .catch((err) => console.warn('Failed to read initial notification response', err));
    });

    return () => {
      cancelled = true;
      subscription?.remove();
    };
  }, [openPath]);

  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      if (!canGoBack) return false;
      webViewRef.current?.goBack();
      return true;
    });

    return () => subscription.remove();
  }, [canGoBack]);

  function handleNavigation(nav: WebViewNavigation) {
    setCanGoBack(nav.canGoBack);
    setCurrentUrl(nav.url);
  }

  function handleMessage(event: WebViewMessageEvent) {
    // The web app's in-page skeleton/spinner handles loading UI on its own.
    // We still need onMessage wired for future bridging (push tokens, etc.).
    void event;
  }

  return (
    <View style={[styles.root, { backgroundColor: systemChromeBackground }]}>
      <StatusBar barStyle={statusBarStyle} />
      <View style={[styles.appFrame, { paddingTop: insets.top }]}>
        <WebView
          ref={webViewRef}
          source={source}
          style={styles.webView}
          originWhitelist={['*']}
          sharedCookiesEnabled
          thirdPartyCookiesEnabled
          javaScriptEnabled
          domStorageEnabled
          applicationNameForUserAgent={NATIVE_SHELL_USER_AGENT}
          automaticallyAdjustContentInsets={false}
          contentInsetAdjustmentBehavior="never"
          injectedJavaScriptBeforeContentLoaded={NATIVE_SHELL_INJECTION}
          injectedJavaScript={NATIVE_SHELL_INJECTION}
          onLoadStart={() => setFailed(false)}
          onLoadEnd={() => {
            if (pushToken) postPushTokenToWeb(pushToken);
          }}
          onMessage={handleMessage}
          onNavigationStateChange={handleNavigation}
          onShouldStartLoadWithRequest={(request) => {
            if (isInternalUrl(request.url)) return true;
            void Linking.openURL(request.url);
            return false;
          }}
          onError={() => setFailed(true)}
          onHttpError={(event) => {
            if (event.nativeEvent.statusCode >= 500) setFailed(true);
          }}
        />

        {failed && (
          <View style={styles.errorOverlay}>
            <Text style={styles.errorTitle}>Couldn’t load Uchetka</Text>
            <Text style={styles.errorText}>Check your connection and try again.</Text>
            <Pressable
              style={({ pressed }) => [styles.retryButton, pressed && styles.retryButtonPressed]}
              onPress={() => {
                setFailed(false);
                webViewRef.current?.reload();
              }}
            >
              <Text style={styles.retryText}>Retry</Text>
            </Pressable>
            <Text style={styles.errorUrl}>{currentUrl}</Text>
          </View>
        )}
      </View>
    </View>
  );
}

async function registerForPushNotificationsAsync(): Promise<string | null> {
  if (!Device.isDevice || IS_EXPO_GO) return null;

  const Notifications = await loadNotifications();

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
    const requested = await Notifications.requestPermissionsAsync();
    status = requested.status;
  }
  if (status !== 'granted') return null;

  const projectId =
    Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId ?? undefined;
  if (!projectId) {
    throw new Error('Missing EAS projectId. Set EXPO_PUBLIC_EAS_PROJECT_ID.');
  }

  const token = await Notifications.getExpoPushTokenAsync({ projectId });
  return token.data;
}

async function loadNotifications(): Promise<typeof import('expo-notifications')> {
  return import('expo-notifications');
}

function normalizeBaseUrl(url: string): string {
  return url.replace(/\/+$/, '');
}

function isInternalUrl(url: string): boolean {
  try {
    return new URL(url).origin === new URL(WEB_APP_URL).origin;
  } catch {
    return false;
  }
}

function buildWebUrl(path: string): string {
  try {
    return new URL(path, `${WEB_APP_URL}/`).toString();
  } catch {
    return WEB_APP_URL;
  }
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  appFrame: {
    flex: 1,
  },
  webView: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  errorOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    padding: 24,
    backgroundColor: '#fafaf9',
  },
  errorTitle: {
    color: '#1a1833',
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
  },
  errorText: {
    color: '#6868a0',
    fontSize: 15,
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 8,
    borderRadius: 999,
    backgroundColor: '#f97316',
    paddingHorizontal: 18,
    paddingVertical: 10,
  },
  retryButtonPressed: {
    opacity: 0.82,
    transform: [{ scale: 0.98 }],
  },
  retryText: {
    color: '#fff7ed',
    fontSize: 15,
    fontWeight: '700',
  },
  errorUrl: {
    marginTop: 8,
    color: '#a1a1aa',
    fontSize: 12,
    textAlign: 'center',
  },
});
