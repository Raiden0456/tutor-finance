import * as React from 'react';
import { Pressable, RefreshControl, ScrollView, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronLeft } from 'lucide-react-native';
import { Icon } from '~/components/ui/icon';
import { Text } from '~/components/ui/text';
import { LanguageToggle } from '~/components/common/language-toggle';
import { ThemeToggle } from '~/components/common/theme-toggle';
import { useColorScheme } from '~/lib/use-color-scheme';
import { cn } from '~/lib/utils';

type ScreenProps = {
  title?: string;
  subtitle?: string;
  right?: React.ReactNode;
  onBack?: () => void;
  children: React.ReactNode;
  scroll?: boolean;
  refreshing?: boolean;
  onRefresh?: () => void;
  contentClassName?: string;
};

/** Standard authed-screen frame: safe-area top, optional header, scroll + pull-to-refresh. */
export function Screen({
  title,
  subtitle,
  right,
  onBack,
  children,
  scroll = true,
  refreshing,
  onRefresh,
  contentClassName,
}: ScreenProps) {
  const insets = useSafeAreaInsets();
  const { colors } = useColorScheme();

  const header =
    title || onBack ? (
      <View className="flex-row items-center justify-between gap-2 px-4 pb-2 pt-2">
        <View className="flex-1 flex-row items-center gap-1">
          {onBack ? (
            <Pressable
              hitSlop={8}
              onPress={onBack}
              className="-ml-1 h-9 w-9 items-center justify-center rounded-full active:bg-accent"
            >
              <Icon as={ChevronLeft} size={24} className="text-foreground" />
            </Pressable>
          ) : null}
          <View className="flex-1">
            {title ? (
              <Text className="text-2xl font-bold" numberOfLines={1}>
                {title}
              </Text>
            ) : null}
            {subtitle ? (
              <Text className="mt-0.5 text-sm text-muted-foreground">{subtitle}</Text>
            ) : null}
          </View>
        </View>
        <View className="flex-row items-center gap-2 pl-1">
          {right}
          {/* Global header controls on top-level screens — mirrors the web app's
              shared mobile header. Detail screens (with a back button) keep
              their own actions uncluttered. */}
          {!onBack ? (
            <>
              <LanguageToggle />
              <ThemeToggle />
            </>
          ) : null}
        </View>
      </View>
    ) : null;

  const body = (
    <Animated.View entering={FadeInDown.duration(300)} className={cn('flex-1', contentClassName)}>
      {children}
    </Animated.View>
  );

  return (
    <View className="flex-1 bg-background" style={{ paddingTop: insets.top }}>
      {header}
      {scroll ? (
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: insets.bottom + 24 }}
          keyboardShouldPersistTaps="handled"
          refreshControl={
            onRefresh ? (
              <RefreshControl
                refreshing={!!refreshing}
                onRefresh={onRefresh}
                tintColor={colors.primary}
              />
            ) : undefined
          }
        >
          {body}
        </ScrollView>
      ) : (
        <View className="flex-1 px-4">{body}</View>
      )}
    </View>
  );
}
