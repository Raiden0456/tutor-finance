import { View } from 'react-native';
import { Tabs } from 'expo-router';
import { LayoutDashboard, Users, CalendarDays, Wallet } from 'lucide-react-native';
import type { LucideIcon } from 'lucide-react-native';
import { GlobalAdd } from '~/components/navigation/global-add';
import { Icon } from '~/components/ui/icon';
import { useColorScheme } from '~/lib/use-color-scheme';
import { useI18n } from '~/lib/i18n';

function tabIcon(LucideComp: LucideIcon) {
  return ({ color }: { color: string }) => <Icon as={LucideComp} size={22} color={color} />;
}

export default function AppTabsLayout() {
  const { colors } = useColorScheme();
  const { t } = useI18n();

  return (
    <View className="flex-1">
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: colors.primary,
          tabBarInactiveTintColor: colors.mutedForeground,
          tabBarStyle: {
            backgroundColor: colors.card,
            borderTopColor: colors.border,
            // Drop Android elevation so the tab bar never paints over modal sheets.
            elevation: 0,
          },
          tabBarLabelStyle: { fontSize: 11, fontFamily: 'Onest_500Medium' },
        }}
      >
        <Tabs.Screen
          name="index"
          options={{ title: t('Dashboard'), tabBarIcon: tabIcon(LayoutDashboard) }}
        />
        <Tabs.Screen
          name="lessons"
          options={{ title: t('Lessons'), tabBarIcon: tabIcon(CalendarDays) }}
        />
        <Tabs.Screen
          name="students"
          options={{ title: t('Students'), tabBarIcon: tabIcon(Users) }}
        />
        <Tabs.Screen
          name="transactions"
          options={{ title: t('Finance'), tabBarIcon: tabIcon(Wallet) }}
        />
      </Tabs>
      <GlobalAdd />
    </View>
  );
}
