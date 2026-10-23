import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { KeyRound, Loader2, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Collapse, FadeSwap } from '@/components/ui/collapse';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { useI18n } from '@/lib/i18n';
import { aiApi } from '../api';
import { useAiErrorHandler } from '../hooks/use-ai-error-handler';
import { useAiStatus } from '../hooks/use-ai-status';
import { loadAiStatus, requestConsent, setAiStatus } from '../stores/ai-status';

type Busy = 'connect' | 'callback' | 'disconnect' | 'consent' | null;

export function AiSettingsCard() {
  const { t } = useI18n();
  const { status, loaded } = useAiStatus();
  const handleError = useAiErrorHandler();
  const [busy, setBusy] = useState<Busy>(null);
  const [awaitingCallback, setAwaitingCallback] = useState(false);
  const [callbackUrl, setCallbackUrl] = useState('');

  useEffect(() => {
    const url = new URL(window.location.href);
    const result = url.searchParams.get('ai_chatgpt');
    if (!result) return;
    if (result === 'connected') toast.success(t('ChatGPT connected'));
    else
      toast.error(t('ChatGPT sign-in failed'), {
        description: url.searchParams.get('reason') ?? undefined,
      });
    url.searchParams.delete('ai_chatgpt');
    url.searchParams.delete('reason');
    window.history.replaceState({}, '', url.toString());
    void loadAiStatus(true);
  }, [t]);

  useEffect(() => {
    if (!awaitingCallback) return;
    const onFocus = () => void loadAiStatus(true);
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [awaitingCallback]);

  useEffect(() => {
    if (status?.providers.chatgpt.connected) setAwaitingCallback(false);
  }, [status?.providers.chatgpt.connected]);

  async function guard(kind: Busy, fn: () => Promise<void>) {
    setBusy(kind);
    try {
      await fn();
    } catch (error) {
      handleError(error);
    } finally {
      setBusy(null);
    }
  }

  function connect() {
    const popup = window.open('', '_blank');
    void guard('connect', async () => {
      try {
        const { url } = await aiApi.chatgptConnect(window.location.href);
        if (popup) {
          popup.opener = null;
          popup.location.href = url;
        } else window.open(url, '_blank', 'noopener');
        setAwaitingCallback(true);
      } catch (error) {
        popup?.close();
        throw error;
      }
    });
  }

  function submitCallback() {
    void guard('callback', async () => {
      setAiStatus(await aiApi.chatgptCallback(callbackUrl.trim()));
      setCallbackUrl('');
      setAwaitingCallback(false);
      toast.success(t('ChatGPT connected'));
    });
  }

  function disconnect() {
    void guard('disconnect', async () => {
      await aiApi.chatgptDisconnect();
      await loadAiStatus(true);
    });
  }

  function toggleConsent() {
    void guard('consent', async () => {
      if (status?.consentGiven) setAiStatus(await aiApi.revokeConsent());
      else await requestConsent();
    });
  }

  const chatgpt = status?.providers.chatgpt;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-sm font-medium">
          <Sparkles className="h-4 w-4" />
          {t('AI assistant')}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <FadeSwap motionKey={!loaded ? 'loading' : status ? 'ready' : 'error'}>
          {!loaded ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              {t('Loading')}…
            </div>
          ) : !status || !chatgpt ? (
            <p className="text-sm text-destructive">{t('Could not load assistant status')}</p>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                {t('Ask questions about your lessons, students and finances.')}
              </p>

              <FadeSwap motionKey={chatgpt.connected ? 'connected' : 'disconnected'}>
                {chatgpt.connected ? (
                  <div className="flex items-center gap-3 rounded-xl border border-border bg-muted/30 p-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium">{t('ChatGPT connected')}</p>
                      {chatgpt.email && (
                        <p className="truncate text-xs text-muted-foreground">
                          {t('Connected as {email}', { email: chatgpt.email })}
                        </p>
                      )}
                    </div>
                    <Button variant="outline" disabled={!!busy} onClick={disconnect}>
                      {busy === 'disconnect' && <Spinner />}
                      {t('Disconnect')}
                    </Button>
                  </div>
                ) : chatgpt.available ? (
                  <div className="space-y-3">
                    <Button onClick={connect} disabled={!!busy} className="w-full sm:w-auto">
                      {busy === 'connect' && <Spinner />}
                      {t('Continue with ChatGPT')}
                    </Button>
                    <Collapse open={awaitingCallback}>
                      <div className="space-y-2 pt-1">
                        <Label htmlFor="ai-callback-url" className="text-xs leading-relaxed">
                          {t(
                            "If the browser ended on a 127.0.0.1 page that didn't load, paste its full address here",
                          )}
                        </Label>
                        <div className="flex gap-2">
                          <Input
                            id="ai-callback-url"
                            value={callbackUrl}
                            onChange={(e) => setCallbackUrl(e.target.value)}
                            placeholder="http://127.0.0.1:1455/auth/callback?code=…"
                          />
                          <Button onClick={submitCallback} disabled={!!busy || !callbackUrl.trim()}>
                            {busy === 'callback' && <Spinner />}
                            {t('Finish connecting')}
                          </Button>
                        </div>
                      </div>
                    </Collapse>
                  </div>
                ) : status.providers.apiKey.available ? null : (
                  <p className="text-sm text-muted-foreground">
                    {t('The assistant is not configured on this server.')}
                  </p>
                )}
              </FadeSwap>

              <Collapse open={status.providers.apiKey.available}>
                <p className="flex items-center gap-2 text-xs text-muted-foreground">
                  <KeyRound className="h-3.5 w-3.5" />
                  {t('API key fallback available')}
                </p>
              </Collapse>

              <div className="flex flex-col gap-3 border-t border-border pt-4 sm:flex-row sm:items-center">
                <p className="min-w-0 flex-1 text-sm text-muted-foreground">
                  {status.consentGiven
                    ? t('The assistant can access your data.')
                    : t('The assistant has no access to your data.')}
                </p>
                <Button
                  variant={status.consentGiven ? 'outline' : 'default'}
                  disabled={!!busy}
                  onClick={toggleConsent}
                  className="w-full sm:w-auto"
                >
                  {busy === 'consent' && <Spinner />}
                  {status.consentGiven
                    ? t('Revoke data sharing consent')
                    : t('Review data sharing')}
                </Button>
              </div>
            </div>
          )}
        </FadeSwap>
      </CardContent>
    </Card>
  );
}
