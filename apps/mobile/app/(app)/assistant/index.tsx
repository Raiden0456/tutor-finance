import { Pressable, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import { ChevronRight, MessageSquare, Plus } from 'lucide-react-native';
import type { AiThread } from '@tutor-finance/shared';
import { GLOBAL_PROMPTS, PromptChips } from '~/components/assistant/prompt-chips';
import { AiSetupCta } from '~/components/assistant/setup-cta';
import { ErrorState } from '~/components/common/error-state';
import { Screen } from '~/components/common/screen';
import { StaggerItem } from '~/components/common/stagger';
import { Button } from '~/components/ui/button';
import { Icon } from '~/components/ui/icon';
import { Skeleton } from '~/components/ui/skeleton';
import { Spinner } from '~/components/ui/spinner';
import { Text } from '~/components/ui/text';
import { api } from '~/lib/api';
import { useAiStatus } from '~/lib/ai/status';
import { useOpenAssistant } from '~/lib/ai/use-open-assistant';
import { formatDate } from '~/lib/format';
import { useI18n } from '~/lib/i18n';
import { useApiQuery } from '~/lib/use-query';

export default function AssistantScreen() {
  const { t, locale } = useI18n();
  const router = useRouter();
  const { status } = useAiStatus();
  const threads = useApiQuery(() => api.get<AiThread[]>('ai/threads'), []);
  const open = useOpenAssistant();
  const setupNeeded = status !== null && !status.ready;

  return (
    <Screen
      title={t('Assistant')}
      onBack={() => router.back()}
      refreshing={threads.loading}
      onRefresh={threads.refetch}
    >
      <View className="gap-5">
        {setupNeeded ? <AiSetupCta needsConsent={!status.consentGiven} /> : null}

        <View className="gap-3">
          <Button onPress={() => void open.run()} disabled={open.pending || setupNeeded}>
            {open.pending ? (
              <Spinner color="#fff" />
            ) : (
              <Icon as={Plus} size={16} className="text-primary-foreground" />
            )}
            <Text>{t('New chat')}</Text>
          </Button>
          <PromptChips
            prompts={GLOBAL_PROMPTS.map((p) => t(p))}
            onPick={(prompt) => void open.run({ prompt })}
            disabled={open.pending || setupNeeded}
          />
        </View>

        <View className="gap-2">
          <Text className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {t('Recent chats')}
          </Text>
          {threads.loading && !threads.data ? (
            <View className="gap-2">
              <Skeleton className="h-14 w-full" />
              <Skeleton className="h-14 w-full" />
            </View>
          ) : threads.error && !threads.data ? (
            <ErrorState message={threads.error} onRetry={threads.refetch} />
          ) : (threads.data ?? []).length === 0 ? (
            <Text className="text-sm text-muted-foreground">{t('No chats yet')}</Text>
          ) : (
            (threads.data ?? []).map((thread, i) => (
              <StaggerItem key={thread.id} index={i}>
                <Pressable
                  onPress={() =>
                    router.push({
                      pathname: '/assistant/[threadId]',
                      params: {
                        threadId: thread.id,
                        ...(thread.studentId ? { studentId: thread.studentId } : {}),
                      },
                    })
                  }
                  className="flex-row items-center gap-3 rounded-xl border border-border bg-card p-3 active:opacity-80"
                >
                  <Icon as={MessageSquare} size={16} className="text-muted-foreground" />
                  <View className="flex-1">
                    <Text className="text-sm font-medium" numberOfLines={1}>
                      {thread.title || t('New chat')}
                    </Text>
                    {thread.running ? (
                      <Animated.View
                        entering={FadeIn.duration(180)}
                        className="flex-row items-center gap-1.5"
                      >
                        <Spinner />
                        <Text className="text-xs text-primary">{t('Answering…')}</Text>
                      </Animated.View>
                    ) : (
                      <Animated.View entering={FadeIn.duration(180)}>
                        <Text className="text-xs text-muted-foreground">
                          {formatDate(thread.updatedAt, 'd MMM HH:mm', locale)}
                        </Text>
                      </Animated.View>
                    )}
                  </View>
                  <Icon as={ChevronRight} size={16} className="text-muted-foreground" />
                </Pressable>
              </StaggerItem>
            ))
          )}
        </View>
      </View>
    </Screen>
  );
}
