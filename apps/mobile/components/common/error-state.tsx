import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { CloudOff, RotateCw } from 'lucide-react-native';
import { EmptyState } from '~/components/common/empty-state';
import { Button } from '~/components/ui/button';
import { Icon } from '~/components/ui/icon';
import { Text } from '~/components/ui/text';
import { useI18n } from '~/lib/i18n';

export function ErrorState({
  message,
  onRetry,
  retrying,
}: {
  message?: string | null;
  onRetry: () => void;
  retrying?: boolean;
}) {
  const { t } = useI18n();
  return (
    <Animated.View entering={FadeIn.duration(220)} exiting={FadeOut.duration(150)}>
      <EmptyState
        icon={CloudOff}
        title={t("Couldn't load data")}
        description={message ?? undefined}
        action={
          <Button variant="outline" size="sm" onPress={onRetry} disabled={retrying}>
            <Icon as={RotateCw} size={15} />
            <Text>{t('Try again')}</Text>
          </Button>
        }
      />
    </Animated.View>
  );
}
