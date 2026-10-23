import * as React from 'react';
import { AppState, Linking, View } from 'react-native';
import Animated, { FadeInDown, FadeOut } from 'react-native-reanimated';
import { useLocalSearchParams } from 'expo-router';
import { Sparkles } from 'lucide-react-native';
import type { AiChatgptConnectResponse, AiStatusResponse } from '@tutor-finance/shared';
import { Button } from '~/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '~/components/ui/card';
import { Icon } from '~/components/ui/icon';
import { Input } from '~/components/ui/input';
import { Spinner } from '~/components/ui/spinner';
import { Text } from '~/components/ui/text';
import { api } from '~/lib/api';
import { APP_SCHEME } from '~/lib/env';
import { requestConsent } from '~/lib/ai/consent';
import { setAiStatus, useAiStatus } from '~/lib/ai/status';
import { useI18n } from '~/lib/i18n';
import { toast } from '~/lib/toast';
import { useMutation } from '~/lib/use-mutation';
import { cn } from '~/lib/utils';

export function AiAssistantCard() {
  const { t } = useI18n();
  const { status, refresh } = useAiStatus();
  const { ai_chatgpt } = useLocalSearchParams<{ ai_chatgpt?: string }>();
  const [awaitingPaste, setAwaitingPaste] = React.useState(false);
  const [callbackUrl, setCallbackUrl] = React.useState('');

  React.useEffect(() => {
    if (!ai_chatgpt) return;
    void refresh();
    if (ai_chatgpt === 'connected') toast.success(t('ChatGPT connected'));
    else toast.error(t('ChatGPT sign-in failed'));
  }, [ai_chatgpt, refresh, t]);

  React.useEffect(() => {
    if (!awaitingPaste) return;
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') void refresh();
    });
    return () => sub.remove();
  }, [awaitingPaste, refresh]);

  React.useEffect(() => {
    if (status?.providers.chatgpt.connected) setAwaitingPaste(false);
  }, [status?.providers.chatgpt.connected]);

  const connect = useMutation(async () => {
    const { url } = await api.get<AiChatgptConnectResponse>('ai/chatgpt/connect', {
      query: { returnTo: `${APP_SCHEME}://settings` },
    });
    setAwaitingPaste(true);
    await Linking.openURL(url);
  });

  const finish = useMutation(async () => {
    setAiStatus(
      await api.post<AiStatusResponse>('ai/chatgpt/callback', { callbackUrl: callbackUrl.trim() }),
    );
    setCallbackUrl('');
    setAwaitingPaste(false);
    toast.success(t('ChatGPT connected'));
  });

  const disconnect = useMutation(async () => {
    await api.delete('ai/chatgpt');
    await refresh();
  });

  const revoke = useMutation(async () => {
    setAiStatus(await api.delete<AiStatusResponse>('ai/consent'));
  });

  const s = status;
  const chatgpt = s?.providers.chatgpt;

  return (
    <Card>
      <CardHeader>
        <View className="flex-row items-center gap-2">
          <Icon as={Sparkles} size={18} className="text-primary" />
          <CardTitle>{t('AI assistant')}</CardTitle>
        </View>
        <CardDescription>
          {t('Ask questions about your lessons, students and finances.')}
        </CardDescription>
      </CardHeader>
      <CardContent className="gap-3">
        {!s ? (
          <Spinner />
        ) : (
          <>
            <View className="flex-row items-center justify-between">
              <Text className="text-sm text-muted-foreground">{t('Status')}</Text>
              <Text
                className={cn(
                  'text-sm font-medium',
                  s.ready ? 'text-income' : 'text-muted-foreground',
                )}
              >
                {s.ready
                  ? s.activeProvider === 'chatgpt'
                    ? t('Ready · ChatGPT')
                    : t('Ready · API key')
                  : t('Not set up')}
              </Text>
            </View>

            {chatgpt?.available ? (
              chatgpt.connected ? (
                <View className="flex-row items-center justify-between gap-2">
                  <Text className="flex-1 text-sm" numberOfLines={1}>
                    {chatgpt.email
                      ? t('Connected as {email}', { email: chatgpt.email })
                      : t('Connected')}
                  </Text>
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={disconnect.pending}
                    onPress={() => void disconnect.run()}
                  >
                    <Text className="text-destructive">{t('Disconnect')}</Text>
                  </Button>
                </View>
              ) : (
                <View className="gap-3">
                  <Button onPress={() => void connect.run()} disabled={connect.pending}>
                    {connect.pending ? (
                      <Spinner color="#fff" />
                    ) : (
                      <Text>{t('Continue with ChatGPT')}</Text>
                    )}
                  </Button>
                  {awaitingPaste ? (
                    <Animated.View
                      entering={FadeInDown.duration(220)}
                      exiting={FadeOut.duration(150)}
                      className="gap-2"
                    >
                      <Text className="text-xs text-muted-foreground">
                        {t(
                          "After signing in, the browser may show a page that can't be opened. Copy its full address and paste it here.",
                        )}
                      </Text>
                      <Input
                        value={callbackUrl}
                        onChangeText={setCallbackUrl}
                        placeholder="http://127.0.0.1/auth/callback?code=…"
                        autoCapitalize="none"
                        autoCorrect={false}
                        keyboardType="url"
                      />
                      <Button
                        variant="secondary"
                        disabled={finish.pending || !callbackUrl.trim()}
                        onPress={() => void finish.run()}
                      >
                        {finish.pending ? <Spinner /> : <Text>{t('Finish connecting')}</Text>}
                      </Button>
                    </Animated.View>
                  ) : null}
                </View>
              )
            ) : null}

            {s.providers.apiKey.available ? (
              <Text className="text-xs text-muted-foreground">{t('API key fallback available')}</Text>
            ) : null}
            {!chatgpt?.available && !s.providers.apiKey.available ? (
              <Text className="text-xs text-muted-foreground">
                {t('The assistant is not configured on this server.')}
              </Text>
            ) : null}

            {s.consentGiven ? (
              <Button
                size="sm"
                variant="ghost"
                disabled={revoke.pending}
                onPress={() => void revoke.run()}
              >
                <Text className="text-destructive">{t('Revoke data sharing consent')}</Text>
              </Button>
            ) : (
              <Button size="sm" variant="outline" onPress={() => void requestConsent()}>
                <Text>{t('Review data sharing')}</Text>
              </Button>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
