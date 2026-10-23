import * as React from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Sparkles } from 'lucide-react-native';
import { ChatInput } from '~/components/assistant/chat-input';
import { ChatMessage } from '~/components/assistant/chat-message';
import { GLOBAL_PROMPTS, PromptChips, STUDENT_PROMPTS } from '~/components/assistant/prompt-chips';
import { AiSetupCta } from '~/components/assistant/setup-cta';
import { ErrorState } from '~/components/common/error-state';
import { Screen } from '~/components/common/screen';
import { Icon } from '~/components/ui/icon';
import { Skeleton } from '~/components/ui/skeleton';
import { Text } from '~/components/ui/text';
import { useAiStatus } from '~/lib/ai/status';
import { useChat } from '~/lib/ai/use-chat';
import { useI18n } from '~/lib/i18n';

export default function AssistantThreadScreen() {
  const { t } = useI18n();
  const router = useRouter();
  const { threadId, studentId, studentName, prompt } = useLocalSearchParams<{
    threadId: string;
    studentId?: string;
    studentName?: string;
    prompt?: string;
  }>();
  const chat = useChat(threadId);
  const { status } = useAiStatus();
  const [input, setInput] = React.useState('');
  const scrollRef = React.useRef<ScrollView>(null);
  const promptSent = React.useRef(false);

  const send = React.useCallback(
    async (text: string) => {
      setInput('');
      if (!(await chat.send(text))) setInput((prev) => prev || text);
    },
    [chat.send],
  );

  React.useEffect(() => {
    if (!prompt || chat.loading || chat.loadError || promptSent.current) return;
    promptSent.current = true;
    void send(prompt);
  }, [prompt, chat.loading, chat.loadError, send]);

  const prompts = (studentId ? STUDENT_PROMPTS : GLOBAL_PROMPTS).map((p) => t(p));
  const empty = !chat.loading && !chat.loadError && chat.messages.length === 0;
  const setupNeeded = chat.blocked !== null || (status !== null && !status.ready);

  return (
    <KeyboardAvoidingView
      className="flex-1"
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <Screen
        title={studentName || t('Assistant')}
        subtitle={studentName ? t('Assistant') : undefined}
        onBack={() => router.back()}
        scroll={false}
        contentClassName="-mx-4"
      >
        <ScrollView
          ref={scrollRef}
          className="flex-1"
          contentContainerStyle={{ padding: 16, gap: 12, flexGrow: 1 }}
          keyboardShouldPersistTaps="handled"
          onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
        >
          {chat.loading ? (
            <View className="gap-3">
              <Skeleton className="h-12 w-3/4 self-end" />
              <Skeleton className="h-24 w-5/6" />
            </View>
          ) : chat.loadError ? (
            <ErrorState message={chat.loadError} onRetry={chat.reload} />
          ) : empty ? (
            <Animated.View entering={FadeIn.duration(240)} className="flex-1 justify-end gap-4">
              <View className="items-center gap-2 pb-2">
                <View className="h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                  <Icon as={Sparkles} size={22} className="text-primary" />
                </View>
                <Text className="text-center text-sm text-muted-foreground">
                  {studentName
                    ? t('Ask anything about {name}.', { name: studentName })
                    : t('Ask about your lessons, students and finances.')}
                </Text>
              </View>
              <PromptChips
                prompts={prompts}
                onPick={(p) => void send(p)}
                disabled={chat.streaming || setupNeeded}
                className="justify-center"
              />
            </Animated.View>
          ) : (
            chat.messages.map((m) => (
              <ChatMessage key={m.id} message={m} onActionUpdated={chat.updateAction} />
            ))
          )}
        </ScrollView>

        {setupNeeded ? (
          <View className="px-4 pb-2">
            <AiSetupCta needsConsent={status !== null && !status.consentGiven} />
          </View>
        ) : null}

        <ChatInput
          value={input}
          onChange={setInput}
          onSend={() => void send(input)}
          onStop={chat.stop}
          streaming={chat.streaming}
          voiceEnabled={status?.transcription?.available === true}
        />
      </Screen>
    </KeyboardAvoidingView>
  );
}
