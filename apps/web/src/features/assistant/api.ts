import type {
  AiChatgptConnectResponse,
  AiDigestResponse,
  AiDigestState,
  AiMessage,
  AiPendingAction,
  AiSendMessageResponse,
  AiStatusResponse,
  AiStreamFrame,
  AiThread,
  AiTranscriptionResponse,
} from '@tutor-finance/shared';
import { api, ApiError, safeParse } from '@/lib/api';
import { BROWSER_API_URL } from '@/lib/env';
import { readEventStream } from './utils/sse';

export const aiApi = {
  status: () => api.get<AiStatusResponse>('/ai/status'),
  giveConsent: () => api.post<AiStatusResponse>('/ai/consent'),
  revokeConsent: () => api.delete<AiStatusResponse>('/ai/consent'),
  chatgptConnect: (returnTo: string) =>
    api.get<AiChatgptConnectResponse>('/ai/chatgpt/connect', { query: { returnTo } }),
  chatgptCallback: (callbackUrl: string) =>
    api.post<AiStatusResponse>('/ai/chatgpt/callback', { callbackUrl }),
  chatgptDisconnect: () => api.delete<{ revoked: boolean }>('/ai/chatgpt'),
  threads: (studentId?: string) => api.get<AiThread[]>('/ai/threads', { query: { studentId } }),
  createThread: (body: { studentId?: string; title?: string }) =>
    api.post<AiThread>('/ai/threads', body),
  messages: (threadId: string) => api.get<AiMessage[]>(`/ai/threads/${threadId}/messages`),
  sendMessage: (threadId: string, content: string) =>
    api.post<AiSendMessageResponse>(`/ai/threads/${threadId}/messages`, { content }),
  stopRun: (threadId: string) => api.post<{ stopped: boolean }>(`/ai/threads/${threadId}/stop`),
  deleteThread: (threadId: string) => api.delete<{ ok: true }>(`/ai/threads/${threadId}`),
  confirmAction: (id: string) => api.post<AiPendingAction>(`/ai/actions/${id}/confirm`),
  rejectAction: (id: string) => api.post<AiPendingAction>(`/ai/actions/${id}/reject`),
  confirmAllActions: (ids: string[]) =>
    api.post<AiPendingAction[]>('/ai/actions/confirm-all', { ids }),
  digest: () => api.get<AiDigestState>('/ai/digest'),
  generateDigest: () => api.post<AiDigestResponse>('/ai/digest'),
  transcribe: (audio: Blob, filename: string) => {
    const form = new FormData();
    form.append('audio', audio, filename);
    return api.post<AiTranscriptionResponse>('/ai/transcribe', form);
  },
};

export async function streamRun(
  threadId: string,
  after: number,
  onFrame: (frame: AiStreamFrame) => void,
  signal: AbortSignal,
): Promise<void> {
  const res = await fetch(`${BROWSER_API_URL}/api/ai/threads/${threadId}/stream?after=${after}`, {
    credentials: 'include',
    headers: { accept: 'text/event-stream' },
    signal,
  });
  if (!res.ok || !res.body) {
    const body = safeParse(await res.text());
    const message =
      body && typeof body === 'object' && 'message' in body
        ? String((body as { message: unknown }).message)
        : res.statusText;
    throw new ApiError(res.status, message || 'Request failed', body);
  }
  await readEventStream(res.body, onFrame);
}
