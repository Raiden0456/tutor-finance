import * as React from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { Screen } from '~/components/common/screen';
import { StaggerItem } from '~/components/common/stagger';
import { AiAssistantCard } from '~/components/settings/ai-assistant-card';
import { GoogleCalendarCard } from '~/components/settings/google-calendar-card';
import { PreferencesSection } from '~/components/settings/preferences-section';
import { ProfileSection } from '~/components/settings/profile-section';
import { SecuritySection } from '~/components/settings/security-section';
import { Skeleton } from '~/components/ui/skeleton';
import { Text } from '~/components/ui/text';
import { useI18n } from '~/lib/i18n';
import { useSettings } from '~/lib/settings';

export default function SettingsScreen() {
  const { t } = useI18n();
  const router = useRouter();
  const { settings, loading } = useSettings();

  return (
    <Screen title={t('Settings')} onBack={() => router.back()}>
      {loading && !settings ? (
        <View className="gap-3">
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-64 w-full" />
        </View>
      ) : settings ? (
        <View className="gap-6">
          <Section index={0} title={t('Profile')}>
            <ProfileSection settings={settings} t={t} />
          </Section>
          <Section index={1} title={t('Preferences')}>
            <PreferencesSection settings={settings} t={t} />
          </Section>
          <Section index={2} title={t('Security')}>
            <SecuritySection settings={settings} t={t} />
          </Section>
          <Section index={3} title={t('Integrations')}>
            <AiAssistantCard />
            <GoogleCalendarCard />
          </Section>
        </View>
      ) : null}
    </Screen>
  );
}

function Section({
  index,
  title,
  children,
}: {
  index: number;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <StaggerItem index={index} step={60}>
      <View className="gap-2">
        <Text className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {title}
        </Text>
        {children}
      </View>
    </StaggerItem>
  );
}
