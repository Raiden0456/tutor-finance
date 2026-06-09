import * as React from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BrandMark } from '~/components/common/brand';
import { ThemeToggle } from '~/components/common/theme-toggle';
import { LanguageToggle } from '~/components/common/language-toggle';
import { Text } from '~/components/ui/text';

export function AuthScaffold({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  const insets = useSafeAreaInsets();
  return (
    <View className="flex-1 bg-background" style={{ paddingTop: insets.top }}>
      <View className="flex-row justify-end gap-2 px-4 pt-2">
        <LanguageToggle />
        <ThemeToggle />
      </View>
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 24 }}
          keyboardShouldPersistTaps="handled"
        >
          <Animated.View entering={FadeInDown.duration(350)} className="gap-6">
            <View className="items-center gap-5">
              <BrandMark size="lg" />
              <View className="items-center gap-1">
                <Text className="text-center text-xl font-bold">{title}</Text>
                {subtitle ? (
                  <Text className="text-center text-sm text-muted-foreground">{subtitle}</Text>
                ) : null}
              </View>
            </View>
            {children}
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
