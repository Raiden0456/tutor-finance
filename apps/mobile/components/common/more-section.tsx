import * as React from 'react';
import { Pressable, View } from 'react-native';
import Animated, {
  FadeInDown,
  FadeOut,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { ChevronDown } from 'lucide-react-native';
import { Icon } from '~/components/ui/icon';
import { Text } from '~/components/ui/text';
import { useI18n } from '~/lib/i18n';

export function MoreSection({
  open,
  onOpenChange,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
}) {
  const { t } = useI18n();
  const rotation = useSharedValue(open ? 180 : 0);

  React.useEffect(() => {
    rotation.value = withTiming(open ? 180 : 0, { duration: 200 });
  }, [open, rotation]);

  const chevronStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));

  return (
    <View className="gap-4">
      <Pressable
        onPress={() => onOpenChange(!open)}
        className="flex-row items-center justify-between rounded-lg border border-dashed border-border px-3 py-2.5 active:bg-accent"
      >
        <Text className="text-sm font-medium text-muted-foreground">
          {open ? t('Fewer options') : t('More options')}
        </Text>
        <Animated.View style={chevronStyle}>
          <Icon as={ChevronDown} size={16} className="text-muted-foreground" />
        </Animated.View>
      </Pressable>
      {open ? (
        <Animated.View
          entering={FadeInDown.duration(220)}
          exiting={FadeOut.duration(150)}
          className="gap-4"
        >
          {children}
        </Animated.View>
      ) : null}
    </View>
  );
}
