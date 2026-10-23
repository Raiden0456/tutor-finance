import { useCallback, useEffect, useState } from 'react';
import type { AiDigestResponse } from '@tutor-finance/shared';
import { RefreshCw, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { FadeSwap } from '@/components/ui/collapse';
import { Skeleton } from '@/components/ui/skeleton';
import { useI18n } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { aiApi } from '../api';
import { integrationsPath, useAiErrorHandler } from '../hooks/use-ai-error-handler';
import { useAiStatus } from '../hooks/use-ai-status';
import { getAiStatusState, loadAiStatus, requestConsent } from '../stores/ai-status';
import { aiErrorCode } from '../utils/errors';
import { openAssistant } from '../utils/events';
import { MarkdownText } from './markdown';

export function DigestCard() {
  const { t, locale } = useI18n();
  const { status, loaded } = useAiStatus();
  const handleError = useAiErrorHandler();
  const [digest, setDigest] = useState<AiDigestResponse | null>(null);
  const [morningHour, setMorningHour] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [failed, setFailed] = useState(false);
  const ready = !!status?.ready;

  const onError = useCallback(
    (error: unknown, notify: boolean) => {
      const code = aiErrorCode(error);
      if (code === 'AI_NOT_CONFIGURED' || code === 'AI_CONSENT_REQUIRED') void loadAiStatus(true);
      else if (notify) handleError(error);
      setFailed(true);
    },
    [handleError],
  );

  const load = useCallback(async () => {
    setLoading(true);
    setFailed(false);
    try {
      const state = await aiApi.digest();
      setDigest(state.digest);
      setMorningHour(state.morningHour);
    } catch (error) {
      onError(error, false);
    } finally {
      setLoading(false);
    }
  }, [onError]);

  async function generate() {
    setGenerating(true);
    setFailed(false);
    try {
      setDigest(await aiApi.generateDigest());
    } catch (error) {
      onError(error, true);
    } finally {
      setGenerating(false);
    }
  }

  useEffect(() => {
    if (ready) void load();
  }, [ready, load]);

  async function enable() {
    if (!(await requestConsent())) return;
    if (!getAiStatusState().status?.activeProvider) window.location.href = integrationsPath(locale);
  }

  if (loaded && !status) return null;

  const state = !loaded ? 'loading' : !ready ? 'cta' : 'digest';
  const bodyState =
    (loading || generating) && !digest
      ? 'loading'
      : failed && !digest
        ? 'failed'
        : !digest
          ? 'empty'
          : 'text';
  const time = digest
    ? new Intl.DateTimeFormat(locale, { hour: '2-digit', minute: '2-digit' }).format(
        new Date(digest.generatedAt),
      )
    : null;

  return (
    <FadeSwap motionKey={state}>
      {state === 'loading' ? (
        <Skeleton className="h-16 rounded-2xl" />
      ) : state === 'cta' ? (
        <div className="flex items-center gap-3 rounded-2xl border border-dashed border-border bg-card/50 px-4 py-3">
          <Sparkles className="h-5 w-5 shrink-0 text-primary" />
          <p className="min-w-0 flex-1 text-sm text-muted-foreground">
            {t('Get a daily summary and answers about your lessons, students and payments.')}
          </p>
          <Button size="sm" variant="outline" onClick={() => void enable()}>
            {t('Enable assistant')}
          </Button>
        </div>
      ) : (
        <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4">
          <div className="mb-2 flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            <h2 className="flex-1 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              {t("Today's digest")}
            </h2>
            <span
              className={cn(
                'text-xs text-muted-foreground transition-opacity duration-200',
                time && !generating ? 'opacity-100' : 'opacity-0',
              )}
            >
              {time && t('Generated {when}', { when: time })}
            </span>
            <Button
              variant="ghost"
              size="icon-sm"
              disabled={loading || generating}
              aria-label={t('Refresh digest')}
              onClick={() => void generate()}
              className="rounded-full text-muted-foreground"
            >
              <RefreshCw className={cn('h-4 w-4', generating && 'animate-spin')} />
            </Button>
          </div>
          <FadeSwap motionKey={bodyState}>
            {bodyState === 'loading' ? (
              <div className="space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-5/6" />
                <Skeleton className="h-4 w-2/3" />
              </div>
            ) : bodyState === 'failed' ? (
              <p className="text-sm text-muted-foreground">{t('Could not prepare the digest.')}</p>
            ) : bodyState === 'empty' ? (
              <div className="flex flex-wrap items-center gap-3">
                <p className="min-w-0 flex-1 text-sm text-muted-foreground">
                  {t('The digest is prepared every morning at {hour}.', {
                    hour: `${String(morningHour ?? 7).padStart(2, '0')}:00`,
                  })}
                </p>
                <Button size="sm" variant="outline" onClick={() => void generate()}>
                  {t('Generate now')}
                </Button>
              </div>
            ) : digest ? (
              <div className={cn('transition-opacity duration-200', generating && 'opacity-60')}>
                <MarkdownText>{digest.text}</MarkdownText>
              </div>
            ) : null}
          </FadeSwap>
          <button
            type="button"
            onClick={() => openAssistant()}
            className="mt-3 text-xs font-medium text-primary transition-opacity duration-200 hover:opacity-80"
          >
            {t('Ask a follow-up')} →
          </button>
        </div>
      )}
    </FadeSwap>
  );
}
