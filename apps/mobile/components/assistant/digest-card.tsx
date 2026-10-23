import * as React from 'react';
import { Pressable, View } from 'react-native';
import Animated, { FadeIn, FadeOut, LinearTransition } from 'react-native-reanimated';
import { RefreshCw, Sparkles } from 'lucide-react-native';
import type { AiDigestResponse, AiDigestState } from '@tutor-finance/shared';
import { MarkdownText } from '~/components/assistant/markdown-text';
import { AiSetupCta } from '~/components/assistant/setup-cta';
import { Icon } from '~/components/ui/icon';
import { Skeleton } from '~/components/ui/skeleton';
import { Spinner } from '~/components/ui/spinner';
import { Text } from '~/components/ui/text';
import { api, ApiError, isUnauthorized } from '~/lib/api';
import { aiErrorCode, handleAiException, SETUP_CODES } from '~/lib/ai/errors';
import { useAiStatus } from '~/lib/ai/status';
import { formatDate } from '~/lib/format';
import { useI18n } from '~/lib/i18n';

export function DigestCard() {
  const { t, locale } = useI18n();
  const { status } = useAiStatus();
  const [digest, setDigest] = React.useState<AiDigestResponse | null>(null);
  const [morningHour, setMorningHour] = React.useState<number | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [generating, setGenerating] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const ready = !!status?.ready;

  const onError = React.useCallback(
    (e: unknown) => {
      if (isUnauthorized(e)) return;
      const code = aiErrorCode(e);
      const rateLimited = e instanceof ApiError && e.status === 429;
      if (rateLimited || code === 'AI_CONSENT_REQUIRED' || (code && SETUP_CODES.includes(code))) {
        handleAiException(e, t);
      }
      if (code !== 'AI_CONSENT_REQUIRED') {
        setError(e instanceof Error ? e.message : t('Something went wrong'));
      }
    },
    [t],
  );

  const load = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const state = await api.get<AiDigestState>('ai/digest');
      setDigest(state.digest);
      setMorningHour(state.morningHour);
    } catch (e) {
      onError(e);
    } finally {
      setLoading(false);
    }
  }, [onError]);

  const generate = React.useCallback(async () => {
    setGenerating(true);
    setError(null);
    try {
      setDigest(await api.post<AiDigestResponse>('ai/digest'));
    } catch (e) {
      onError(e);
    } finally {
      setGenerating(false);
    }
  }, [onError]);

  React.useEffect(() => {
    if (ready) void load();
  }, [ready, load]);

  if (!status) return null;
  if (!ready) return <AiSetupCta needsConsent={!status.consentGiven} />;

  return (
    <Animated.View
      entering={FadeIn.duration(240)}
      layout={LinearTransition.duration(220)}
      className="gap-3 rounded-xl border border-border bg-card p-4"
    >
      <View className="flex-row items-center justify-between">
        <View className="flex-row items-center gap-2">
          <Icon as={Sparkles} size={16} className="text-primary" />
          <Text className="text-sm font-semibold">{t("Today's digest")}</Text>
        </View>
        <Pressable
          hitSlop={8}
          disabled={loading || generating}
          onPress={() => void generate()}
          className="h-8 w-8 items-center justify-center rounded-full active:bg-accent"
        >
          {generating ? (
            <Spinner />
          ) : (
            <Icon as={RefreshCw} size={15} className="text-muted-foreground" />
          )}
        </Pressable>
      </View>

      {digest ? (
        <Animated.View
          key={digest.generatedAt}
          entering={FadeIn.duration(220)}
          className={generating ? 'opacity-60' : undefined}
        >
          <MarkdownText text={digest.text} />
          <Text className="mt-2 text-xs text-muted-foreground">
            {t('Generated {when}', { when: formatDate(digest.generatedAt, 'd MMM HH:mm', locale) })}
          </Text>
        </Animated.View>
      ) : error ? (
        <Animated.View entering={FadeIn.duration(180)} className="gap-2">
          <Text className="text-sm text-destructive">{error}</Text>
          <Pressable onPress={() => void load()} className="self-start active:opacity-70">
            <Text className="text-sm font-medium text-primary">{t('Try again')}</Text>
          </Pressable>
        </Animated.View>
      ) : !loading && !generating && morningHour !== null ? (
        <Animated.View entering={FadeIn.duration(180)} className="gap-2">
          <Text className="text-sm text-muted-foreground">
            {t('The digest is prepared every morning at {hour}.', {
              hour: `${String(morningHour).padStart(2, '0')}:00`,
            })}
          </Text>
          <Pressable onPress={() => void generate()} className="self-start active:opacity-70">
            <Text className="text-sm font-medium text-primary">{t('Generate now')}</Text>
          </Pressable>
        </Animated.View>
      ) : (
        <Animated.View exiting={FadeOut.duration(150)} className="gap-2">
          <Skeleton className="h-3.5 w-11/12" />
          <Skeleton className="h-3.5 w-4/5" />
          <Skeleton className="h-3.5 w-2/3" />
        </Animated.View>
      )}
    </Animated.View>
  );
}
