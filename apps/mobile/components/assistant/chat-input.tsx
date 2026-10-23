import * as React from 'react';
import { Keyboard, Platform, Pressable, TextInput, View } from 'react-native';
import Animated, { ZoomIn, ZoomOut } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowUp, Mic, Square } from 'lucide-react-native';
import { VoiceBar } from '~/components/assistant/voice-bar';
import { Icon } from '~/components/ui/icon';
import { useVoiceRecorder } from '~/lib/ai/use-voice-recorder';
import { useColorScheme } from '~/lib/use-color-scheme';
import { useI18n } from '~/lib/i18n';
import { cn } from '~/lib/utils';

function useKeyboardOpen() {
  const [open, setOpen] = React.useState(false);
  React.useEffect(() => {
    const show = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hide = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const subs = [
      Keyboard.addListener(show, () => setOpen(true)),
      Keyboard.addListener(hide, () => setOpen(false)),
    ];
    return () => subs.forEach((s) => s.remove());
  }, []);
  return open;
}

export function ChatInput({
  value,
  onChange,
  onSend,
  onStop,
  streaming,
  voiceEnabled,
}: {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  onStop: () => void;
  streaming: boolean;
  voiceEnabled: boolean;
}) {
  const { t } = useI18n();
  const { colors } = useColorScheme();
  const insets = useSafeAreaInsets();
  const keyboardOpen = useKeyboardOpen();
  const inputRef = React.useRef<TextInput>(null);
  const valueRef = React.useRef(value);
  const canSend = value.trim().length > 0;

  React.useEffect(() => {
    valueRef.current = value;
  }, [value]);

  const appendTranscript = React.useCallback(
    (text: string) => {
      const prev = valueRef.current.trimEnd();
      onChange(prev ? `${prev} ${text}` : text);
      inputRef.current?.focus();
    },
    [onChange],
  );
  const voice = useVoiceRecorder(appendTranscript);

  const startVoice = () => {
    Keyboard.dismiss();
    void voice.start();
  };

  return (
    <View
      className="border-t border-border bg-background px-4 pt-2"
      style={{ paddingBottom: (keyboardOpen ? 0 : insets.bottom) + 8 }}
    >
      <View className="flex-row items-end gap-2">
        <TextInput
          ref={inputRef}
          value={value}
          onChangeText={onChange}
          placeholder={t('Ask anything…')}
          placeholderTextColor={colors.mutedForeground}
          multiline
          maxLength={8000}
          className="max-h-32 min-h-10 flex-1 rounded-2xl border border-input bg-card px-3.5 py-2.5 text-base leading-5 text-foreground"
        />
        {voiceEnabled ? (
          <Animated.View key="mic" entering={ZoomIn.duration(160)} exiting={ZoomOut.duration(120)}>
            <Pressable
              hitSlop={6}
              onPress={startVoice}
              accessibilityLabel={t('Voice input')}
              className="h-10 w-10 items-center justify-center rounded-full bg-secondary active:opacity-80"
            >
              <Icon as={Mic} size={18} className="text-secondary-foreground" />
            </Pressable>
          </Animated.View>
        ) : null}
        {streaming ? (
          <Animated.View key="stop" entering={ZoomIn.duration(160)} exiting={ZoomOut.duration(120)}>
            <Pressable
              hitSlop={6}
              onPress={onStop}
              className="h-10 w-10 items-center justify-center rounded-full bg-foreground active:opacity-80"
            >
              <Icon as={Square} size={14} color={colors.background} fill={colors.background} />
            </Pressable>
          </Animated.View>
        ) : (
          <Animated.View key="send" entering={ZoomIn.duration(160)} exiting={ZoomOut.duration(120)}>
            <Pressable
              hitSlop={6}
              disabled={!canSend}
              onPress={onSend}
              className={cn(
                'h-10 w-10 items-center justify-center rounded-full bg-primary active:opacity-80',
                !canSend && 'opacity-40',
              )}
            >
              <Icon as={ArrowUp} size={18} color={colors.primaryForeground} />
            </Pressable>
          </Animated.View>
        )}
        {voice.phase !== 'idle' ? (
          <VoiceBar
            phase={voice.phase}
            durationMs={voice.durationMs}
            onCancel={() => void voice.cancel()}
            onStop={() => void voice.stop()}
          />
        ) : null}
      </View>
    </View>
  );
}
