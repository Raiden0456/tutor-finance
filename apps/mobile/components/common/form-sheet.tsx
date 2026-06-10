import * as React from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X } from 'lucide-react-native';
import { Icon } from '~/components/ui/icon';
import { Text } from '~/components/ui/text';

type FormSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
};

/**
 * Bottom-sheet container for forms / action menus, hosted in a native RN Modal.
 * The Modal owns its own native window, so the sheet always paints above the
 * tab bar and system chrome (no z-index/elevation wars — the old portal-based
 * sheet was painted over by the Android tab bar). The sheet wraps its content
 * height (capped at 88% of the window), and the safe-area inset is padding
 * INSIDE the card so it reaches the screen edge with no floating gap.
 */
export function FormSheet({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
}: FormSheetProps) {
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();
  const [mounted, setMounted] = React.useState(open);
  const progress = useSharedValue(0);
  const unmount = React.useCallback(() => setMounted(false), []);

  React.useEffect(() => {
    if (open) {
      setMounted(true);
      progress.value = withTiming(1, { duration: 240, easing: Easing.out(Easing.cubic) });
    } else if (mounted) {
      progress.value = withTiming(0, { duration: 200, easing: Easing.in(Easing.cubic) }, (done) => {
        if (done) scheduleOnRN(unmount);
      });
    }
  }, [open, mounted, progress, unmount]);

  const backdropStyle = useAnimatedStyle(() => ({ opacity: progress.value }));
  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: interpolate(progress.value, [0, 1], [700, 0]) }],
  }));

  if (!mounted) return null;

  return (
    <Modal
      visible
      transparent
      animationType="none"
      statusBarTranslucent
      navigationBarTranslucent
      onRequestClose={() => onOpenChange(false)}
    >
      <View className="flex-1 justify-end">
        <Animated.View style={[StyleSheet.absoluteFill, backdropStyle]} className="bg-black/50">
          <Pressable className="flex-1" onPress={() => onOpenChange(false)} />
        </Animated.View>

        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <Animated.View
            style={[sheetStyle, { maxHeight: windowHeight * 0.88 }]}
            className="rounded-t-3xl border border-border bg-card"
          >
            <View className="items-center pt-3">
              <View className="h-1.5 w-10 rounded-full bg-border" />
            </View>

            {title || description ? (
              <View className="flex-row items-start justify-between px-5 pb-1 pt-3">
                <View className="flex-1 pr-3">
                  {title ? <Text className="text-lg font-semibold">{title}</Text> : null}
                  {description ? (
                    <Text className="mt-1 text-sm text-muted-foreground">{description}</Text>
                  ) : null}
                </View>
                <Pressable
                  hitSlop={8}
                  onPress={() => onOpenChange(false)}
                  className="h-8 w-8 items-center justify-center rounded-full active:bg-accent"
                >
                  <Icon as={X} size={18} className="text-muted-foreground" />
                </Pressable>
              </View>
            ) : null}

            <ScrollView
              className="px-5"
              style={{ flexShrink: 1 }}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={{ paddingVertical: 12 }}
            >
              {children}
            </ScrollView>

            {footer ? (
              <View className="gap-2 border-t border-border px-5 pt-3">{footer}</View>
            ) : null}

            <View style={{ height: insets.bottom + 8 }} />
          </Animated.View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}
