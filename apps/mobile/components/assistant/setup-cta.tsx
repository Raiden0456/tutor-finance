import { View } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import { Sparkles } from 'lucide-react-native';
import { Button } from '~/components/ui/button';
import { Icon } from '~/components/ui/icon';
import { Text } from '~/components/ui/text';
import { requestConsent } from '~/lib/ai/consent';
import { useI18n } from '~/lib/i18n';

export function AiSetupCta({ needsConsent }: { needsConsent: boolean }) {
  const { t } = useI18n();
  const router = useRouter();

  return (
    <Animated.View
      entering={FadeIn.duration(220)}
      exiting={FadeOut.duration(150)}
      className="flex-row items-center gap-3 rounded-xl border border-dashed border-primary/40 bg-primary/5 p-4"
    >
      <View className="h-9 w-9 items-center justify-center rounded-full bg-primary/10">
        <Icon as={Sparkles} size={17} className="text-primary" />
      </View>
      <View className="flex-1 gap-2">
        <Text className="text-sm text-muted-foreground">
          {needsConsent
            ? t('Get a daily summary and answers about your lessons, students and payments.')
            : t('Connect ChatGPT in Settings to start using the assistant.')}
        </Text>
        <Button
          size="sm"
          className="self-start"
          onPress={() => (needsConsent ? void requestConsent() : router.push('/settings'))}
        >
          <Text>{needsConsent ? t('Enable assistant') : t('Open settings')}</Text>
        </Button>
      </View>
    </Animated.View>
  );
}
