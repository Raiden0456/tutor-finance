import '~/global.css';

import * as React from 'react';
import { ThemeProvider } from '@react-navigation/native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { PortalHost } from '@rn-primitives/portal';
import {
  useFonts,
  Onest_400Regular,
  Onest_500Medium,
  Onest_600SemiBold,
  Onest_700Bold,
} from '@expo-google-fonts/onest';

import { NAV_THEME } from '~/lib/theme';
import { useColorScheme } from '~/lib/use-color-scheme';
import { ThemePrefProvider } from '~/lib/theme-pref';
import { I18nProvider } from '~/lib/i18n';
import { SettingsProvider } from '~/lib/settings';
import { authClient } from '~/lib/auth-client';
import { usePushNotifications } from '~/lib/use-push-notifications';

void SplashScreen.preventAutoHideAsync();
SplashScreen.setOptions({ duration: 220, fade: true });

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Onest_400Regular,
    Onest_500Medium,
    Onest_600SemiBold,
    Onest_700Bold,
  });

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ThemePrefProvider>
          <I18nProvider>
            <Providers fontsLoaded={fontsLoaded} />
          </I18nProvider>
        </ThemePrefProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

function Providers({ fontsLoaded }: { fontsLoaded: boolean }) {
  const { colorScheme } = useColorScheme();

  return (
    <ThemeProvider value={NAV_THEME[colorScheme]}>
      <SettingsProvider>
        <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
        <AuthGate fontsLoaded={fontsLoaded} />
        <PortalHost />
      </SettingsProvider>
    </ThemeProvider>
  );
}

function AuthGate({ fontsLoaded }: { fontsLoaded: boolean }) {
  const { data: session, isPending } = authClient.useSession();
  const segments = useSegments();
  const router = useRouter();

  usePushNotifications(!!session?.user);

  const ready = fontsLoaded && !isPending;

  React.useEffect(() => {
    if (ready) void SplashScreen.hideAsync();
  }, [ready]);

  React.useEffect(() => {
    if (!ready) return;
    const inAuthGroup = segments[0] === '(auth)';
    if (!session?.user && !inAuthGroup) {
      router.replace('/(auth)/login');
    } else if (session?.user && inAuthGroup) {
      router.replace('/(app)');
    }
  }, [ready, session?.user, segments, router]);

  if (!ready) return null;

  return (
    <Stack screenOptions={{ headerShown: false, animation: 'fade' }}>
      <Stack.Screen name="(app)" />
      <Stack.Screen name="(auth)" />
    </Stack>
  );
}
