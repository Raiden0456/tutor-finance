import { Pressable } from 'react-native';
import Animated, { Easing, withSequence, withTiming } from 'react-native-reanimated';
import { Moon, Sun } from 'lucide-react-native';
import { Icon } from '~/components/ui/icon';
import { useColorScheme } from '~/lib/use-color-scheme';
import { useThemePref } from '~/lib/theme-pref';

// Mirrors the web `theme-icon-in` keyframes: rotate -90→12→-6→0deg,
// scale 0.4→1.15→0.95→1, fade in.
function themeIconIn() {
  'worklet';
  return {
    initialValues: { opacity: 0, transform: [{ rotate: '-90deg' }, { scale: 0.4 }] },
    animations: {
      opacity: withTiming(1, { duration: 300 }),
      transform: [
        {
          rotate: withSequence(
            withTiming('12deg', { duration: 180, easing: Easing.out(Easing.quad) }),
            withTiming('-6deg', { duration: 60 }),
            withTiming('0deg', { duration: 60 }),
          ),
        },
        {
          scale: withSequence(
            withTiming(1.15, { duration: 180, easing: Easing.out(Easing.quad) }),
            withTiming(0.95, { duration: 60 }),
            withTiming(1, { duration: 60 }),
          ),
        },
      ],
    },
  };
}

export function ThemeToggle() {
  const { isDarkColorScheme } = useColorScheme();
  const { setTheme } = useThemePref();
  return (
    <Pressable
      hitSlop={8}
      onPress={() => setTheme(isDarkColorScheme ? 'light' : 'dark')}
      className="h-9 w-9 items-center justify-center rounded-full border border-border bg-card active:opacity-80"
    >
      <Animated.View key={isDarkColorScheme ? 'dark' : 'light'} entering={themeIconIn}>
        <Icon as={isDarkColorScheme ? Sun : Moon} size={18} className="text-foreground" />
      </Animated.View>
    </Pressable>
  );
}
