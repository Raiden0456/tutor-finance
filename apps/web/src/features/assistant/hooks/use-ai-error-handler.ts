import { useCallback } from 'react';
import { toast } from 'sonner';
import { errorMessage } from '@/hooks/use-mutation';
import { localizePath, useI18n, type Locale } from '@/lib/i18n';
import { loadAiStatus, requestConsent } from '../stores/ai-status';
import { aiErrorCode, VoiceError, type VoiceErrorReason } from '../utils/errors';

const VOICE_MESSAGES: Record<VoiceErrorReason, string> = {
  denied: 'Microphone access is blocked. Allow it in your browser settings to use voice input.',
  'no-device': 'No microphone found.',
  busy: 'The microphone is being used by another app.',
  unsupported: 'Voice input is not supported in this browser.',
  'no-speech': 'No speech detected. Try again.',
};

export function integrationsPath(locale: Locale) {
  return `${localizePath('/settings', locale)}?tab=integrations`;
}

export function useAiErrorHandler() {
  const { t, locale } = useI18n();
  return useCallback(
    (error: unknown) => {
      if (error instanceof VoiceError) {
        toast.error(t(VOICE_MESSAGES[error.reason]));
        return null;
      }
      const code = aiErrorCode(error);
      if (code === 'AI_CONSENT_REQUIRED') {
        void loadAiStatus(true).then(() => requestConsent());
      } else if (code === 'AI_NOT_CONFIGURED' || code === 'AI_RECONNECT_REQUIRED') {
        void loadAiStatus(true);
        toast.error(
          code === 'AI_NOT_CONFIGURED'
            ? t('Connect ChatGPT in Settings to start using the assistant.')
            : t('Reconnect ChatGPT to keep using the assistant'),
          {
            action: {
              label: t('Open settings'),
              onClick: () => (window.location.href = integrationsPath(locale)),
            },
          },
        );
      } else if (code === 'AI_TRANSCRIPTION_NOT_CONFIGURED') {
        void loadAiStatus(true);
        toast.error(t('Voice input is not available on this server.'));
      } else if (code === 'AI_TRANSCRIPTION_FAILED') {
        toast.error(t("Couldn't recognize speech. Try again."));
      } else if (code === 'AI_RUN_IN_PROGRESS') {
        toast.error(t('The assistant is still answering. Wait for it to finish.'));
      } else if (code === 'RATE_LIMITED') {
        toast.error(t('Too many requests. Try again in a minute.'));
      } else {
        toast.error(t(errorMessage(error, t)));
      }
      return code;
    },
    [t, locale],
  );
}
