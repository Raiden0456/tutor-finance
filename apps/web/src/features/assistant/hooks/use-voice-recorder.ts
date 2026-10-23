import { useCallback, useEffect, useRef, useState } from 'react';
import { aiApi } from '../api';
import { VoiceError, type VoiceErrorReason } from '../utils/errors';

export type VoiceRecorderState = 'idle' | 'recording' | 'transcribing';

const MAX_DURATION_MS = 10 * 60 * 1000;
const MIME_TYPES = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg;codecs=opus'];
const LEVEL_SAMPLES = 32;
const LEVEL_INTERVAL_MS = 80;

interface Session {
  stream: MediaStream;
  recorder: MediaRecorder;
  chunks: Blob[];
  timer: ReturnType<typeof setInterval>;
  frame: number;
  audioContext: AudioContext | null;
}

export function isVoiceRecordingSupported() {
  return (
    typeof window !== 'undefined' &&
    typeof window.MediaRecorder !== 'undefined' &&
    !!navigator.mediaDevices?.getUserMedia
  );
}

function pickMimeType() {
  return MIME_TYPES.find((type) => MediaRecorder.isTypeSupported(type));
}

function fileExtension(mimeType: string) {
  if (mimeType.includes('mp4')) return 'mp4';
  if (mimeType.includes('ogg')) return 'ogg';
  return 'webm';
}

function permissionReason(error: unknown): VoiceErrorReason {
  const name = error instanceof DOMException ? error.name : '';
  if (name === 'NotAllowedError' || name === 'SecurityError') return 'denied';
  if (name === 'NotFoundError' || name === 'OverconstrainedError') return 'no-device';
  if (name === 'NotReadableError' || name === 'AbortError') return 'busy';
  return 'unsupported';
}

function startLevelMeter(stream: MediaStream, onLevel: (level: number) => void) {
  const AudioContextCtor =
    window.AudioContext ??
    (window as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioContextCtor) return null;
  const audioContext = new AudioContextCtor();
  const analyser = audioContext.createAnalyser();
  analyser.fftSize = 512;
  audioContext.createMediaStreamSource(stream).connect(analyser);
  void audioContext.resume().catch(() => undefined);
  const data = new Uint8Array(analyser.fftSize);
  return {
    audioContext,
    tick: () => {
      analyser.getByteTimeDomainData(data);
      let sum = 0;
      for (const value of data) sum += ((value - 128) / 128) ** 2;
      onLevel(Math.min(1, Math.sqrt(sum / data.length) * 4));
    },
  };
}

export function useVoiceRecorder({
  onTranscript,
  onError,
}: {
  onTranscript: (text: string) => void;
  onError: (error: unknown) => void;
}) {
  const [state, setState] = useState<VoiceRecorderState>('idle');
  const [elapsed, setElapsed] = useState(0);
  const [levels, setLevels] = useState<number[]>([]);
  const session = useRef<Session | null>(null);
  const starting = useRef(false);
  const mounted = useRef(true);
  const callbacks = useRef({ onTranscript, onError });

  useEffect(() => {
    callbacks.current = { onTranscript, onError };
  });

  const release = useCallback(() => {
    const current = session.current;
    if (!current) return;
    session.current = null;
    clearInterval(current.timer);
    cancelAnimationFrame(current.frame);
    current.stream.getTracks().forEach((track) => track.stop());
    void current.audioContext?.close().catch(() => undefined);
    setElapsed(0);
    setLevels([]);
  }, []);

  const transcribe = useCallback(async (blob: Blob) => {
    if (blob.size === 0) {
      setState('idle');
      callbacks.current.onError(new VoiceError('no-speech'));
      return;
    }
    setState('transcribing');
    try {
      const { text } = await aiApi.transcribe(blob, `voice.${fileExtension(blob.type)}`);
      if (!mounted.current) return;
      if (text.trim()) callbacks.current.onTranscript(text.trim());
      else callbacks.current.onError(new VoiceError('no-speech'));
    } catch (error) {
      if (mounted.current) callbacks.current.onError(error);
    } finally {
      if (mounted.current) setState('idle');
    }
  }, []);

  const finish = useCallback(
    (keep: boolean) => {
      const current = session.current;
      if (!current) return;
      const { recorder, chunks } = current;
      recorder.onstop = keep
        ? () => void transcribe(new Blob(chunks, { type: recorder.mimeType || chunks[0]?.type }))
        : null;
      if (recorder.state !== 'inactive') recorder.stop();
      release();
      if (!keep) setState('idle');
    },
    [release, transcribe],
  );

  const stop = useCallback(() => finish(true), [finish]);
  const cancel = useCallback(() => finish(false), [finish]);

  const start = useCallback(async () => {
    if (session.current || starting.current) return;
    if (!isVoiceRecordingSupported()) {
      callbacks.current.onError(new VoiceError('unsupported'));
      return;
    }
    starting.current = true;
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      });
    } catch (error) {
      starting.current = false;
      callbacks.current.onError(new VoiceError(permissionReason(error)));
      return;
    }
    starting.current = false;
    if (!mounted.current) {
      stream.getTracks().forEach((track) => track.stop());
      return;
    }

    let recorder: MediaRecorder;
    try {
      const mimeType = pickMimeType();
      recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
    } catch {
      stream.getTracks().forEach((track) => track.stop());
      callbacks.current.onError(new VoiceError('unsupported'));
      return;
    }

    const chunks: Blob[] = [];
    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) chunks.push(event.data);
    };
    recorder.start(1000);

    const startedAt = Date.now();
    let lastLevelAt = 0;
    let meter: ReturnType<typeof startLevelMeter> | null = null;
    try {
      meter = startLevelMeter(stream, (level) => {
        setLevels((prev) => [...prev, level].slice(-LEVEL_SAMPLES));
      });
    } catch {
      meter = null;
    }

    const current: Session = {
      stream,
      recorder,
      chunks,
      audioContext: meter?.audioContext ?? null,
      frame: 0,
      timer: setInterval(() => {
        const ms = Date.now() - startedAt;
        setElapsed(Math.floor(ms / 1000));
        if (ms >= MAX_DURATION_MS) finish(true);
      }, 250),
    };
    const loop = (now: number) => {
      if (session.current !== current) return;
      if (meter && now - lastLevelAt >= LEVEL_INTERVAL_MS) {
        lastLevelAt = now;
        meter.tick();
      }
      current.frame = requestAnimationFrame(loop);
    };
    session.current = current;
    current.frame = requestAnimationFrame(loop);
    setState('recording');
  }, [finish]);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      const current = session.current;
      if (current) current.recorder.onstop = null;
      if (current && current.recorder.state !== 'inactive') current.recorder.stop();
      release();
    };
  }, [release]);

  return { state, elapsed, levels, start, stop, cancel };
}
