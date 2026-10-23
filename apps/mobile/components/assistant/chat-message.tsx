import { View } from 'react-native';
import Animated, { FadeIn, FadeInDown, FadeOut, LinearTransition } from 'react-native-reanimated';
import { Check, X } from 'lucide-react-native';
import { aiErrorMessageKey, type AiPendingAction } from '@tutor-finance/shared';
import { ActionCard, ConfirmAllButton } from '~/components/assistant/action-card';
import { MarkdownText } from '~/components/assistant/markdown-text';
import { Icon } from '~/components/ui/icon';
import { Spinner } from '~/components/ui/spinner';
import { Text } from '~/components/ui/text';
import { toolLabel } from '~/lib/ai/tool-labels';
import type { ChatMessage as Message } from '~/lib/ai/use-chat';
import { useI18n } from '~/lib/i18n';

export function ChatMessage({
  message,
  onActionUpdated,
}: {
  message: Message;
  onActionUpdated: (action: AiPendingAction) => void;
}) {
  const { t } = useI18n();

  if (message.role === 'user') {
    return (
      <Animated.View
        entering={FadeInDown.duration(220)}
        className="max-w-[85%] self-end rounded-2xl rounded-br-md bg-primary px-3.5 py-2.5"
      >
        <Text className="text-sm text-primary-foreground">{message.content}</Text>
      </Animated.View>
    );
  }

  const running = message.status === 'running';
  const tools = running ? (message.tools ?? []) : [];
  const thinking = running && !message.content && tools.length === 0;
  const notice =
    message.status === 'error' && message.error
      ? { text: t(aiErrorMessageKey(message.error)), className: 'text-destructive' }
      : message.status === 'interrupted'
        ? { text: t('The answer was interrupted. Ask again.'), className: 'text-muted-foreground' }
        : message.status === 'stopped' && !message.content && message.actions.length === 0
          ? { text: t('Stopped'), className: 'text-muted-foreground' }
          : null;

  return (
    <Animated.View
      entering={FadeInDown.duration(220)}
      layout={LinearTransition.duration(200)}
      className="max-w-[92%] gap-2 self-start"
    >
      {tools.map((tool) => (
        <Animated.View
          key={tool.name}
          entering={FadeIn.duration(180)}
          exiting={FadeOut.duration(150)}
          className="flex-row items-center gap-2"
        >
          {tool.status === 'started' ? (
            <Spinner />
          ) : (
            <Icon
              as={tool.status === 'completed' ? Check : X}
              size={14}
              className={tool.status === 'completed' ? 'text-income' : 'text-destructive'}
            />
          )}
          <Text className="text-xs text-muted-foreground">{toolLabel(tool.name, t)}</Text>
        </Animated.View>
      ))}

      {thinking ? (
        <Animated.View
          entering={FadeIn.duration(180)}
          exiting={FadeOut.duration(150)}
          className="flex-row items-center gap-2 rounded-2xl rounded-bl-md border border-border bg-card px-3.5 py-2.5"
        >
          <Spinner />
          <Text className="text-sm text-muted-foreground">{t('Thinking…')}</Text>
        </Animated.View>
      ) : message.content ? (
        <View className="rounded-2xl rounded-bl-md border border-border bg-card px-3.5 py-2.5">
          <MarkdownText text={message.content} />
        </View>
      ) : null}

      {message.actions.map((action) => (
        <Animated.View key={action.id} entering={FadeInDown.duration(220)}>
          <ActionCard action={action} onUpdated={onActionUpdated} />
        </Animated.View>
      ))}

      {running ? null : <ConfirmAllButton actions={message.actions} onUpdated={onActionUpdated} />}

      {notice ? (
        <Animated.View entering={FadeIn.duration(180)}>
          <Text className={`text-xs ${notice.className}`}>{notice.text}</Text>
        </Animated.View>
      ) : null}
    </Animated.View>
  );
}
