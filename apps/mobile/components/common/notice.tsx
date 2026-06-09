import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { Text } from '~/components/ui/text';
import { cn } from '~/lib/utils';

export function Notice({
  message,
  variant = 'error',
}: {
  message?: string | null;
  variant?: 'error' | 'success';
}) {
  if (!message) return null;
  return (
    <Animated.View
      entering={FadeIn.duration(180)}
      exiting={FadeOut.duration(120)}
      className={cn(
        'rounded-lg border px-3 py-2.5',
        variant === 'error'
          ? 'border-destructive/30 bg-destructive/10'
          : 'border-income/30 bg-income/10',
      )}
    >
      <Text className={cn('text-sm', variant === 'error' ? 'text-destructive' : 'text-income')}>
        {message}
      </Text>
    </Animated.View>
  );
}
