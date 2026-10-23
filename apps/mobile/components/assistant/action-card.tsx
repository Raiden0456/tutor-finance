import { View } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { Check, CheckCheck, CircleAlert, Wand2, X } from 'lucide-react-native';
import type { AiPendingAction } from '@tutor-finance/shared';
import { Button } from '~/components/ui/button';
import { Icon } from '~/components/ui/icon';
import { Spinner } from '~/components/ui/spinner';
import { Text } from '~/components/ui/text';
import { api } from '~/lib/api';
import { bumpDataVersion } from '~/lib/data-version';
import { useI18n } from '~/lib/i18n';
import { toast } from '~/lib/toast';
import { useMutation } from '~/lib/use-mutation';

export function ConfirmAllButton({
  actions,
  onUpdated,
}: {
  actions: AiPendingAction[];
  onUpdated: (action: AiPendingAction) => void;
}) {
  const { t } = useI18n();
  const pending = actions.filter((a) => a.status === 'pending');
  const confirmAll = useMutation(
    async () => {
      const updated = await api.post<AiPendingAction[]>('ai/actions/confirm-all', {
        ids: pending.map((a) => a.id),
      });
      updated.forEach(onUpdated);
      if (updated.some((a) => a.status === 'confirmed')) bumpDataVersion();
      if (updated.some((a) => a.status === 'failed')) toast.error(t('Could not apply the change'));
      else if (updated.every((a) => a.status !== 'pending')) toast.success(t('Change applied'));
    },
    { onError: (message) => toast.error(t(message)) },
  );

  if (pending.length < 2) return null;
  return (
    <Animated.View entering={FadeIn.duration(200)} exiting={FadeOut.duration(150)}>
      <Button size="sm" disabled={confirmAll.pending} onPress={() => void confirmAll.run()}>
        {confirmAll.pending ? (
          <Spinner color="#fff" />
        ) : (
          <Icon as={CheckCheck} size={15} className="text-primary-foreground" />
        )}
        <Text>
          {t('Confirm all')} · {pending.length}
        </Text>
      </Button>
    </Animated.View>
  );
}

export function ActionCard({
  action,
  onUpdated,
}: {
  action: AiPendingAction;
  onUpdated: (action: AiPendingAction) => void;
}) {
  const { t } = useI18n();
  const decide = useMutation(
    async (verb: 'confirm' | 'reject') => {
      const next = await api.post<AiPendingAction>(`ai/actions/${action.id}/${verb}`);
      onUpdated(next);
      if (next.status === 'confirmed') {
        bumpDataVersion();
        toast.success(t('Change applied'));
      }
    },
    { onError: (message) => toast.error(t(message)) },
  );

  return (
    <View className="gap-3 rounded-xl border border-primary/30 bg-primary/5 p-3">
      <View className="flex-row gap-2">
        <Icon as={Wand2} size={16} className="mt-0.5 text-primary" />
        <Text className="flex-1 text-sm">{action.summary}</Text>
      </View>
      <Animated.View key={action.status} entering={FadeIn.duration(200)}>
        {action.status === 'pending' ? (
          <View className="flex-row gap-2">
            <Button
              size="sm"
              className="flex-1"
              disabled={decide.pending}
              onPress={() => void decide.run('confirm')}
            >
              {decide.pending ? (
                <Spinner color="#fff" />
              ) : (
                <Icon as={Check} size={15} className="text-primary-foreground" />
              )}
              <Text>{t('Confirm')}</Text>
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="flex-1"
              disabled={decide.pending}
              onPress={() => void decide.run('reject')}
            >
              <Icon as={X} size={15} />
              <Text>{t('Reject')}</Text>
            </Button>
          </View>
        ) : (
          <ActionStatus action={action} />
        )}
      </Animated.View>
    </View>
  );
}

function ActionStatus({ action }: { action: AiPendingAction }) {
  const { t } = useI18n();
  if (action.status === 'confirmed') {
    return (
      <View className="flex-row items-center gap-1.5">
        <Icon as={Check} size={14} className="text-income" />
        <Text className="text-xs font-medium text-income">{t('Confirmed')}</Text>
      </View>
    );
  }
  if (action.status === 'rejected') {
    return <Text className="text-xs font-medium text-muted-foreground">{t('Rejected')}</Text>;
  }
  const reason =
    action.result && typeof action.result === 'object' && 'error' in action.result
      ? String((action.result as { error: unknown }).error)
      : null;
  return (
    <View className="flex-row items-center gap-1.5">
      <Icon as={CircleAlert} size={14} className="text-destructive" />
      <Text className="flex-1 text-xs text-destructive">
        {reason ?? t('Could not apply the change')}
      </Text>
    </View>
  );
}
