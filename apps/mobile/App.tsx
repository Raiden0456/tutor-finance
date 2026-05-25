import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  BackHandler,
  Linking,
  Platform,
  Pressable,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { WebView, type WebViewNavigation } from 'react-native-webview';
import type { WebView as WebViewType } from 'react-native-webview';

const PUSH_TOKEN_MESSAGE = 'tutor-finance:expo-push-token';
const DEFAULT_WEB_APP_URL = 'http://localhost:4321';
const WEB_APP_URL = normalizeBaseUrl(
  process.env.EXPO_PUBLIC_WEB_APP_URL ??
    (Constants.expoConfig?.extra?.webAppUrl as string | undefined) ??
    DEFAULT_WEB_APP_URL,
);

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export default function App() {
  const webViewRef = useRef<WebViewType>(null);
  const [canGoBack, setCanGoBack] = useState(false);
  const [sourceUrl, setSourceUrl] = useState(WEB_APP_URL);
  const [currentUrl, setCurrentUrl] = useState(WEB_APP_URL);
  const [pushToken, setPushToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loaderVisible, setLoaderVisible] = useState(true);
  const [failed, setFailed] = useState(false);
  const fade = useRef(new Animated.Value(1)).current;

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
    const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
      const path = response.notification.request.content.data?.path;
      if (typeof path === 'string') openPath(path);
    });

    Notifications.getLastNotificationResponseAsync()
      .then((response) => {
        const path = response?.notification.request.content.data?.path;
        if (typeof path === 'string') openPath(path);
      })
      .catch((err) => console.warn('Failed to read initial notification response', err));

    return () => subscription.remove();
  }, [openPath]);

  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      if (!canGoBack) return false;
      webViewRef.current?.goBack();
      return true;
    });

    return () => subscription.remove();
  }, [canGoBack]);

  useEffect(() => {
    if (loading) {
      setLoaderVisible(true);
      fade.setValue(1);
      return;
    }

    Animated.timing(fade, {
      toValue: 0,
      duration: 180,
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) setLoaderVisible(false);
    });
  }, [fade, loading]);

  function handleNavigation(nav: WebViewNavigation) {
    setCanGoBack(nav.canGoBack);
    setCurrentUrl(nav.url);
  }

  return (
    <SafeAreaView style={styles.root}>
      <StatusBar barStyle="default" />
      <WebView
        ref={webViewRef}
        source={source}
        style={styles.webView}
        originWhitelist={['*']}
        sharedCookiesEnabled
        thirdPartyCookiesEnabled
        javaScriptEnabled
        domStorageEnabled
        startInLoadingState
        onLoadStart={() => {
          setFailed(false);
          setLoading(true);
        }}
        onLoadEnd={() => {
          setLoading(false);
          if (pushToken) postPushTokenToWeb(pushToken);
        }}
        onNavigationStateChange={handleNavigation}
        onShouldStartLoadWithRequest={(request) => {
          if (isInternalUrl(request.url)) return true;
          void Linking.openURL(request.url);
          return false;
        }}
        onError={() => {
          setFailed(true);
          setLoading(false);
        }}
        onHttpError={(event) => {
          if (event.nativeEvent.statusCode >= 500) setFailed(true);
        }}
      />

      {loaderVisible && (
        <Animated.View pointerEvents="none" style={[styles.loadingOverlay, { opacity: fade }]}>
          <ActivityIndicator size="large" color="#f97316" />
        </Animated.View>
      )}

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
    </SafeAreaView>
  );
}

async function registerForPushNotificationsAsync(): Promise<string | null> {
  if (!Device.isDevice) return null;

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
    backgroundColor: '#111113',
  },
  webView: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#111113',
  },
  errorOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    padding: 24,
    backgroundColor: '#111113',
  },
  errorTitle: {
    color: '#faf4ed',
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
  },
  errorText: {
    color: '#a8a29e',
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
    color: '#78716c',
    fontSize: 12,
    textAlign: 'center',
  },
});
