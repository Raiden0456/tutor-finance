import { View } from 'react-native';
import Animated, { FadeInUp, FadeOutUp } from 'react-native-reanimated';
import { useNetworkState } from 'expo-network';
import { WifiOff } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon } from '~/components/ui/icon';
import { Text } from '~/components/ui/text';
import { useI18n } from '~/lib/i18n';

export function OfflineBanner() {
  const { t } = useI18n();
  const insets = useSafeAreaInsets();
  const { isConnected, isInternetReachable } = useNetworkState();
  const offline = isConnected === false || isInternetReachable === false;

  return (
    <View pointerEvents="none" className="absolute inset-x-0 top-0" style={{ top: insets.top + 4 }}>
      {offline ? (
        <Animated.View
          entering={FadeInUp.duration(220)}
          exiting={FadeOutUp.duration(160)}
          className="mx-auto flex-row items-center gap-2 rounded-full bg-foreground px-4 py-2"
        >
          <Icon as={WifiOff} size={14} className="text-background" />
          <Text className="text-xs font-medium text-background">{t('No internet connection')}</Text>
        </Animated.View>
      ) : null}
    </View>
  );
}
