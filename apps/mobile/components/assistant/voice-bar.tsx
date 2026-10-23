import * as React from 'react';
import { Pressable, View } from 'react-native';
import Animated, {
  FadeIn,
  FadeOut,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { Check, X } from 'lucide-react-native';
import { Icon } from '~/components/ui/icon';
import { Spinner } from '~/components/ui/spinner';
import { Text } from '~/components/ui/text';
import type { VoicePhase } from '~/lib/ai/use-voice-recorder';
import { useColorScheme } from '~/lib/use-color-scheme';
import { useI18n } from '~/lib/i18n';
import { cn } from '~/lib/utils';

function formatDuration(ms: number) {
  const total = Math.floor(ms / 1000);
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
}

function PulsingDot() {
  const opacity = useSharedValue(1);

  React.useEffect(() => {
    opacity.value = withRepeat(withTiming(0.25, { duration: 700 }), -1, true);
    return () => cancelAnimation(opacity);
  }, [opacity]);

  const style = useAnimatedStyle(() => ({ opacity: opacity.value }));
  return <Animated.View style={style} className="h-2.5 w-2.5 rounded-full bg-destructive" />;
}

export function VoiceBar({
  phase,
  durationMs,
  onCancel,
  onStop,
}: {
  phase: Exclude<VoicePhase, 'idle'>;
  durationMs: number;
  onCancel: () => void;
  onStop: () => void;
}) {
  const { t } = useI18n();
  const { colors } = useColorScheme();
  const recording = phase === 'recording';

  return (
    <Animated.View
      entering={FadeIn.duration(180)}
      exiting={FadeOut.duration(140)}
      className="absolute inset-0 flex-row items-center gap-2 bg-background"
    >
      <Pressable
        hitSlop={6}
        disabled={!recording}
        onPress={onCancel}
        accessibilityLabel={t('Cancel')}
        className={cn(
          'h-10 w-10 items-center justify-center rounded-full bg-secondary active:opacity-80',
          !recording && 'opacity-40',
        )}
      >
        <Icon as={X} size={18} className="text-secondary-foreground" />
      </Pressable>
      <View className="h-10 flex-1 flex-row items-center gap-2.5 rounded-2xl border border-input bg-card px-3.5">
        {recording ? (
          <Animated.View
            key="rec"
            entering={FadeIn.duration(160)}
            className="flex-row items-center gap-2.5"
          >
            <PulsingDot />
            <Text className="text-base tabular-nums text-foreground">
              {formatDuration(durationMs)}
            </Text>
          </Animated.View>
        ) : (
          <Animated.View
            key="busy"
            entering={FadeIn.duration(160)}
            className="flex-row items-center gap-2.5"
          >
            <Spinner />
            <Text className="text-base text-muted-foreground">{t('Transcribing…')}</Text>
          </Animated.View>
        )}
      </View>
      <Pressable
        hitSlop={6}
        disabled={!recording}
        onPress={onStop}
        accessibilityLabel={t('Stop recording')}
        className={cn(
          'h-10 w-10 items-center justify-center rounded-full bg-primary active:opacity-80',
          !recording && 'opacity-40',
        )}
      >
        <Icon as={Check} size={18} color={colors.primaryForeground} />
      </Pressable>
    </Animated.View>
  );
}
