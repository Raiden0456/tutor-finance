import { Check, X } from 'lucide-react';
import { motion } from 'motion/react';
import { Button } from '@/components/ui/button';
import { FadeSwap } from '@/components/ui/collapse';
import { Spinner } from '@/components/ui/spinner';
import { useI18n } from '@/lib/i18n';
import type { VoiceRecorderState } from '../hooks/use-voice-recorder';

const BAR_COUNT = 32;

function formatElapsed(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  return `${minutes}:${String(seconds % 60).padStart(2, '0')}`;
}

export function VoiceRecordingBar({
  state,
  elapsed,
  levels,
  onCancel,
  onStop,
}: {
  state: Exclude<VoiceRecorderState, 'idle'>;
  elapsed: number;
  levels: number[];
  onCancel: () => void;
  onStop: () => void;
}) {
  const { t } = useI18n();
  const bars = Array.from(
    { length: BAR_COUNT },
    (_, i) => levels[levels.length - BAR_COUNT + i] ?? 0,
  );

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.98 }}
      transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
      className="absolute inset-0 flex items-center gap-2 rounded-md border border-input bg-background px-1.5"
      role="status"
      aria-live="polite"
    >
      <Button
        size="icon"
        variant="ghost"
        className="shrink-0"
        onClick={onCancel}
        disabled={state === 'transcribing'}
        aria-label={t('Cancel')}
      >
        <X className="h-4 w-4" />
      </Button>
      <FadeSwap
        motionKey={state}
        className="flex min-w-0 flex-1 items-center gap-3"
        duration={0.15}
      >
        {state === 'recording' ? (
          <>
            <span className="relative flex h-2.5 w-2.5 shrink-0">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500 opacity-60" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-red-500" />
            </span>
            <span className="shrink-0 text-sm font-medium tabular-nums">
              {formatElapsed(elapsed)}
            </span>
            <div className="flex h-6 min-w-0 flex-1 items-center justify-end gap-[2px] overflow-hidden">
              {bars.map((level, i) => (
                <span
                  key={i}
                  className="w-[3px] shrink-0 rounded-full bg-foreground/60 transition-[height] duration-100 ease-out"
                  style={{ height: `${Math.max(12, level * 100)}%` }}
                />
              ))}
            </div>
          </>
        ) : (
          <span className="flex items-center gap-2 text-sm text-muted-foreground">
            <Spinner />
            {t('Transcribing…')}
          </span>
        )}
      </FadeSwap>
      <Button
        size="icon"
        className="shrink-0"
        onClick={onStop}
        disabled={state === 'transcribing'}
        aria-label={t('Done')}
      >
        <Check className="h-4 w-4" />
      </Button>
    </motion.div>
  );
}
