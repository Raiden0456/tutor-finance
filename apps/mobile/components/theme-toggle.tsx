import { Pressable } from 'react-native';
import { Moon, Sun } from 'lucide-react-native';
import { Icon } from '~/components/ui/icon';
import { useColorScheme } from '~/lib/use-color-scheme';
import { useThemePref } from '~/lib/theme-pref';

export function ThemeToggle() {
  const { isDarkColorScheme } = useColorScheme();
  const { setTheme } = useThemePref();
  return (
    <Pressable
      hitSlop={8}
      onPress={() => setTheme(isDarkColorScheme ? 'light' : 'dark')}
      className="h-9 w-9 items-center justify-center rounded-full border border-border bg-card active:opacity-80"
    >
      <Icon as={isDarkColorScheme ? Sun : Moon} size={18} className="text-foreground" />
    </Pressable>
  );
}
