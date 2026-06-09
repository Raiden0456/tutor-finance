import * as React from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  View,
} from 'react-native';
import Animated, {
  Easing,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
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
 * Bottom-sheet container for forms (the mobile counterpart of the web app's
 * responsive dialog/drawer). Animated backdrop + slide, keyboard avoidance and
 * safe-area padding. RNR form controls (Input/Select/Button) live inside.
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
  const [mounted, setMounted] = React.useState(open);
  const progress = useSharedValue(0);
  const unmount = React.useCallback(() => setMounted(false), []);

  React.useEffect(() => {
    if (open) {
      setMounted(true);
      progress.value = withTiming(1, { duration: 240, easing: Easing.out(Easing.cubic) });
    } else if (mounted) {
      progress.value = withTiming(0, { duration: 200, easing: Easing.in(Easing.cubic) }, (done) => {
        if (done) runOnJS(unmount)();
      });
    }
  }, [open, mounted, progress, unmount]);

  const backdropStyle = useAnimatedStyle(() => ({ opacity: progress.value }));
  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: interpolate(progress.value, [0, 1], [700, 0]) }],
  }));

  if (!mounted) return null;

  return (
    <Modal transparent visible animationType="none" onRequestClose={() => onOpenChange(false)}>
      <View className="flex-1 justify-end">
        <Animated.View style={backdropStyle} className="absolute inset-0 bg-black/50">
          <Pressable className="flex-1" onPress={() => onOpenChange(false)} />
        </Animated.View>

        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <Animated.View
            style={sheetStyle}
            className="max-h-[88%] rounded-t-3xl border border-border bg-card"
          >
            <View className="items-center pt-3">
              <View className="h-1.5 w-10 rounded-full bg-border" />
            </View>

            {(title || description) && (
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
            )}

            <ScrollView
              className="px-5"
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={{ paddingVertical: 12 }}
            >
              {children}
            </ScrollView>

            <View
              className="gap-2 border-t border-border px-5 pt-3"
              style={{ paddingBottom: insets.bottom + 12 }}
            >
              {footer}
            </View>
          </Animated.View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}
