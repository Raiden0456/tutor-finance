import type { AiLanguage } from './types.js';

export type AiProviderKind = 'chatgpt' | 'api_key';

export type AiErrorCode =
  | 'AI_NOT_CONFIGURED'
  | 'AI_CONSENT_REQUIRED'
  | 'AI_PROVIDER_ERROR'
  | 'AI_USAGE_LIMIT'
  | 'AI_RECONNECT_REQUIRED'
  | 'AI_LOOP_LIMIT'
  | 'AI_RUN_IN_PROGRESS'
  | 'AI_INTERNAL_ERROR'
  | 'AI_TRANSCRIPTION_NOT_CONFIGURED'
  | 'AI_TRANSCRIPTION_FAILED';

export interface AiStatusResponse {
  providers: {
    chatgpt: { available: boolean; connected: boolean; email?: string };
    apiKey: { available: boolean };
  };
  activeProvider: AiProviderKind | null;
  consentGiven: boolean;
  ready: boolean;
  transcription: { available: boolean };
}

export interface AiTranscriptionResponse {
  text: string;
}

export interface AiChatgptConnectResponse {
  url: string;
  redirectUri: string;
}

export interface AiChatgptCallbackRequest {
  callbackUrl: string;
}

export interface AiThread {
  id: string;
  studentId: string | null;
  title: string | null;
  running: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AiCreateThreadRequest {
  studentId?: string;
  title?: string;
}

export type AiActionStatus = 'pending' | 'confirmed' | 'rejected' | 'failed';

export interface AiPendingAction {
  id: string;
  threadId: string;
  tool: string;
  summary: string;
  args: Record<string, unknown>;
  status: AiActionStatus;
  result: unknown;
  createdAt: string;
}

export interface AiConfirmAllRequest {
  ids: string[];
}

export type AiMessageStatus = 'running' | 'done' | 'error' | 'stopped' | 'interrupted';

export interface AiRunError {
  code: AiErrorCode;
  message: string;
}

export interface AiMessage {
  id: string;
  threadId: string;
  role: 'user' | 'assistant';
  content: string;
  status: AiMessageStatus;
  error: AiRunError | null;
  actions: AiPendingAction[];
  createdAt: string;
}

export interface AiSendMessageRequest {
  content: string;
}

export interface AiSendMessageResponse {
  messageId: string;
  userMessageId: string;
}

export interface AiDigestResponse {
  text: string;
  generatedAt: string;
}

export interface AiDigestState {
  digest: AiDigestResponse | null;
  morningHour: number;
}

export type AiStreamEvent =
  | { event: 'delta'; data: { text: string } }
  | { event: 'tool'; data: { name: string; status: 'started' | 'completed' | 'failed' } }
  | {
      event: 'action';
      data: {
        pendingActionId: string;
        tool: string;
        summary: string;
        args: Record<string, unknown>;
      };
    }
  | { event: 'done'; data: { messageId: string; status: 'done' | 'stopped' } }
  | { event: 'error'; data: AiRunError & { messageId: string } }
  | { event: 'state'; data: { running: false } };

export type AiStreamFrame = AiStreamEvent & { seq: number };

export const AI_LANGUAGE_NAMES: Record<Exclude<AiLanguage, 'auto'>, string> = {
  ru: 'Русский',
  en: 'English',
  uk: 'Українська',
  kk: 'Қазақша',
  tr: 'Türkçe',
  pl: 'Polski',
  de: 'Deutsch',
  es: 'Español',
  fr: 'Français',
  it: 'Italiano',
};

const AI_ERROR_MESSAGES: Partial<Record<AiErrorCode, string>> = {
  AI_NOT_CONFIGURED: 'Connect ChatGPT in Settings to start using the assistant.',
  AI_RECONNECT_REQUIRED: 'Reconnect ChatGPT to keep using the assistant',
  AI_USAGE_LIMIT: 'ChatGPT usage limit reached. Try again later.',
  AI_LOOP_LIMIT: 'The assistant needed too many steps. Try a narrower question.',
  AI_PROVIDER_ERROR: 'The AI service returned an error. Try again in a moment.',
  AI_INTERNAL_ERROR: 'Something went wrong',
  AI_RUN_IN_PROGRESS: 'The assistant is still answering. Wait for it to finish.',
  AI_TRANSCRIPTION_FAILED: 'Could not transcribe the recording.',
};

export function aiErrorMessageKey(error: { code: AiErrorCode; message: string }): string {
  return AI_ERROR_MESSAGES[error.code] ?? error.message;
}
