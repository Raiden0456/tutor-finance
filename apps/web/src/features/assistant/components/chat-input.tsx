import { useRef, useState, type KeyboardEvent } from 'react';
import { ArrowUp, Mic, Square } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useI18n } from '@/lib/i18n';
import { useAiErrorHandler } from '../hooks/use-ai-error-handler';
import { useAiStatus } from '../hooks/use-ai-status';
import { isVoiceRecordingSupported, useVoiceRecorder } from '../hooks/use-voice-recorder';
import { VoiceRecordingBar } from './voice-recording-bar';

export function ChatInput({
  streaming,
  disabled,
  onSend,
  onStop,
}: {
  streaming: boolean;
  disabled?: boolean;
  onSend: (content: string) => Promise<boolean>;
  onStop: () => void;
}) {
  const { t } = useI18n();
  const { status } = useAiStatus();
  const handleError = useAiErrorHandler();
  const [value, setValue] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const voice = useVoiceRecorder({
    onTranscript: (text) => {
      setValue((prev) => (prev.trim() ? `${prev.trimEnd()} ${text}` : text));
      requestAnimationFrame(() => {
        const el = textareaRef.current;
        if (!el) return;
        el.focus();
        el.setSelectionRange(el.value.length, el.value.length);
      });
    },
    onError: handleError,
  });
  const voiceAvailable = !!status?.transcription.available && isVoiceRecordingSupported();

  async function submit() {
    const content = value.trim();
    if (!content || streaming || disabled) return;
    setValue('');
    if (!(await onSend(content))) setValue(content);
  }

  function onKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault();
      void submit();
    }
  }

  return (
    <div className="relative flex items-end gap-2">
      <Textarea
        ref={textareaRef}
        rows={1}
        value={value}
        disabled={disabled}
        onChange={(event) => setValue(event.target.value)}
        onKeyDown={onKeyDown}
        placeholder={t('Ask anything…')}
        aria-label={t('Message')}
        className="max-h-40 min-h-10 resize-none"
      />
      <AnimatePresence initial={false}>
        {voiceAvailable && (
          <motion.div
            initial={{ opacity: 0, width: 0 }}
            animate={{ opacity: 1, width: 'auto' }}
            exit={{ opacity: 0, width: 0 }}
            transition={{ duration: 0.2 }}
            className="shrink-0 overflow-hidden"
          >
            <Button
              size="icon"
              variant="ghost"
              onClick={() => void voice.start()}
              disabled={disabled}
              aria-label={t('Voice input')}
            >
              <Mic className="h-4 w-4" />
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
      {streaming ? (
        <Button size="icon" variant="outline" onClick={onStop} aria-label={t('Stop')}>
          <Square className="h-4 w-4 fill-current" />
        </Button>
      ) : (
        <Button
          size="icon"
          onClick={() => void submit()}
          disabled={disabled || !value.trim()}
          aria-label={t('Send')}
        >
          <ArrowUp className="h-4 w-4" />
        </Button>
      )}
      <AnimatePresence>
        {voice.state !== 'idle' && (
          <VoiceRecordingBar
            state={voice.state}
            elapsed={voice.elapsed}
            levels={voice.levels}
            onCancel={voice.cancel}
            onStop={voice.stop}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
