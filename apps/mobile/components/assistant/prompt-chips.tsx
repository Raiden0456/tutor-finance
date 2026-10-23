import { Pressable, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Text } from '~/components/ui/text';
import { cn } from '~/lib/utils';

export const GLOBAL_PROMPTS = [
  'Summary for this week',
  'Who owes me?',
  'Any schedule conflicts?',
  'Plan my next lessons',
];

export const STUDENT_PROMPTS = [
  'Prepare a plan for the next lesson',
  'Suggest homework',
  'How is progress going?',
  'Draft a payment reminder message',
];

export function PromptChips({
  prompts,
  onPick,
  disabled,
  className,
}: {
  prompts: string[];
  onPick: (prompt: string) => void;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <View className={cn('flex-row flex-wrap gap-2', className)}>
      {prompts.map((prompt, i) => (
        <Animated.View key={prompt} entering={FadeInDown.duration(220).delay(i * 40)}>
          <Pressable
            disabled={disabled}
            onPress={() => onPick(prompt)}
            className={cn(
              'rounded-full border border-border bg-card px-3 py-2 active:bg-accent',
              disabled && 'opacity-50',
            )}
          >
            <Text className="text-sm">{prompt}</Text>
          </Pressable>
        </Animated.View>
      ))}
    </View>
  );
}
