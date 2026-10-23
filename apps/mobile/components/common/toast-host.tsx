import { Pressable, View } from 'react-native';
import Animated, { FadeInDown, FadeOutDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text } from '~/components/ui/text';
import { dismissToast, useToast } from '~/lib/toast';
import { cn } from '~/lib/utils';

export function ToastHost() {
  const current = useToast();
  const insets = useSafeAreaInsets();

  return (
    <View
      pointerEvents="box-none"
      className="absolute inset-x-4"
      style={{ bottom: insets.bottom + 88 }}
    >
      {current ? (
        <Animated.View
          key={current.id}
          entering={FadeInDown.duration(220)}
          exiting={FadeOutDown.duration(160)}
        >
          <Pressable
            onPress={dismissToast}
            className={cn(
              'rounded-xl border px-4 py-3 shadow-lg shadow-black/10',
              current.variant === 'error'
                ? 'border-destructive/30 bg-card'
                : 'border-income/30 bg-card',
            )}
          >
            <Text
              className={cn(
                'text-sm font-medium',
                current.variant === 'error' ? 'text-destructive' : 'text-income',
              )}
            >
              {current.message}
            </Text>
          </Pressable>
        </Animated.View>
      ) : null}
    </View>
  );
}
