import * as React from 'react';
import {
  AudioModule,
  RecordingPresets,
  setAudioModeAsync,
  useAudioRecorder,
  useAudioRecorderState,
} from 'expo-audio';
import type { AiTranscriptionResponse } from '@tutor-finance/shared';
import { authHeaders, buildUrl, toApiError } from '~/lib/api';
import { aiErrorCode, handleAiException } from '~/lib/ai/errors';
import { refreshAiStatus } from '~/lib/ai/status';
import { useI18n } from '~/lib/i18n';
import { toast } from '~/lib/toast';

export type VoicePhase = 'idle' | 'recording' | 'transcribing';

const MAX_DURATION_MS = 10 * 60 * 1000;
const MIN_DURATION_MS = 500;
const TRANSCRIBE_PATH = 'ai/transcribe';

async function transcribe(uri: string, signal: AbortSignal): Promise<string> {
  const form = new FormData();
  form.append('audio', { uri, name: 'speech.m4a', type: 'audio/m4a' } as unknown as Blob);
  const res = await fetch(buildUrl(TRANSCRIBE_PATH), {
    method: 'POST',
    headers: { accept: 'application/json', ...authHeaders() },
    body: form,
    signal,
  });
  const text = await res.text();
  if (!res.ok) throw toApiError(res, TRANSCRIBE_PATH, text);
  return (JSON.parse(text) as AiTranscriptionResponse).text.trim();
}

function releaseAudioMode() {
  return setAudioModeAsync({ allowsRecording: false }).catch(() => undefined);
}

export function useVoiceRecorder(onText: (text: string) => void) {
  const { t } = useI18n();
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const { durationMillis } = useAudioRecorderState(recorder, 250);
  const [phase, setPhaseState] = React.useState<VoicePhase>('idle');
  const phaseRef = React.useRef<VoicePhase>('idle');
  const abortRef = React.useRef<AbortController | null>(null);
  const onTextRef = React.useRef(onText);

  React.useEffect(() => {
    onTextRef.current = onText;
  }, [onText]);

  const setPhase = React.useCallback((next: VoicePhase) => {
    phaseRef.current = next;
    setPhaseState(next);
  }, []);

  const start = React.useCallback(async () => {
    if (phaseRef.current !== 'idle') return;
    const permission = await AudioModule.requestRecordingPermissionsAsync().catch(() => null);
    if (!permission?.granted) {
      toast.error(
        t('Microphone access is blocked. Allow it in your device settings to use voice input.'),
      );
      return;
    }
    try {
      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
      await recorder.prepareToRecordAsync();
      recorder.record();
      setPhase('recording');
    } catch {
      await releaseAudioMode();
      toast.error(t("Couldn't start recording"));
    }
  }, [recorder, setPhase, t]);

  const finish = React.useCallback(
    async (submit: boolean) => {
      if (phaseRef.current !== 'recording') return;
      const duration = recorder.getStatus().durationMillis;
      setPhase(submit ? 'transcribing' : 'idle');
      try {
        await recorder.stop();
      } catch {
        await releaseAudioMode();
        setPhase('idle');
        toast.error(t('Something went wrong'));
        return;
      }
      await releaseAudioMode();
      const uri = recorder.uri;
      if (!submit || !uri || duration < MIN_DURATION_MS) {
        setPhase('idle');
        return;
      }

      const controller = new AbortController();
      abortRef.current = controller;
      try {
        const text = await transcribe(uri, controller.signal);
        if (text) onTextRef.current(text);
        else toast.error(t('No speech detected. Try again.'));
      } catch (e) {
        if (controller.signal.aborted) return;
        if (aiErrorCode(e) === 'AI_TRANSCRIPTION_NOT_CONFIGURED') {
          void refreshAiStatus().catch(() => undefined);
          toast.error(t('Voice input is not available on this server.'));
        } else if (aiErrorCode(e) === 'AI_TRANSCRIPTION_FAILED') {
          toast.error(t("Couldn't recognize speech. Try again."));
        } else {
          handleAiException(e, t);
        }
      } finally {
        if (abortRef.current === controller) abortRef.current = null;
        if (!controller.signal.aborted) setPhase('idle');
      }
    },
    [recorder, setPhase, t],
  );

  const stop = React.useCallback(() => finish(true), [finish]);
  const cancel = React.useCallback(() => finish(false), [finish]);

  React.useEffect(() => {
    if (phase === 'recording' && durationMillis >= MAX_DURATION_MS) void finish(true);
  }, [phase, durationMillis, finish]);

  React.useEffect(
    () => () => {
      abortRef.current?.abort();
      if (phaseRef.current === 'recording') void releaseAudioMode();
    },
    [],
  );

  return {
    phase,
    durationMs: phase === 'recording' ? durationMillis : 0,
    start,
    stop,
    cancel,
  };
}
