import * as React from 'react';
import { AppState } from 'react-native';
import { useFocusEffect } from 'expo-router';
import type {
  AiErrorCode,
  AiMessage,
  AiPendingAction,
  AiSendMessageResponse,
  AiStreamFrame,
} from '@tutor-finance/shared';
import { api, ApiError } from '~/lib/api';
import { ensureConsent } from '~/lib/ai/consent';
import { aiErrorCode, handleAiException, SETUP_CODES } from '~/lib/ai/errors';
import { refreshAiStatus } from '~/lib/ai/status';
import { streamRun } from '~/lib/ai/stream';
import { useI18n } from '~/lib/i18n';

export type ToolActivity = { name: string; status: 'started' | 'completed' | 'failed' };

export type ChatMessage = AiMessage & { tools?: ToolActivity[] };

interface Run {
  messageId: string;
  seq: number;
  fresh: boolean;
  controller: AbortController;
}

const MAX_BACKOFF_MS = 15_000;

function wait(ms: number, signal: AbortSignal) {
  return new Promise<void>((resolve) => {
    const timer = setTimeout(resolve, ms);
    signal.addEventListener('abort', () => {
      clearTimeout(timer);
      resolve();
    });
  });
}

function applyFrame(m: ChatMessage, e: AiStreamFrame, threadId: string): ChatMessage {
  switch (e.event) {
    case 'delta':
      return { ...m, content: m.content + e.data.text };
    case 'tool': {
      const tools = (m.tools ?? []).filter((x) => x.name !== e.data.name);
      return { ...m, tools: [...tools, e.data] };
    }
    case 'action':
      if (m.actions.some((a) => a.id === e.data.pendingActionId)) return m;
      return {
        ...m,
        actions: [
          ...m.actions,
          {
            id: e.data.pendingActionId,
            threadId,
            tool: e.data.tool,
            summary: e.data.summary,
            args: e.data.args,
            status: 'pending',
            result: null,
            createdAt: new Date().toISOString(),
          },
        ],
      };
    case 'done':
      return { ...m, status: e.data.status };
    case 'error':
      return { ...m, status: 'error', error: { code: e.data.code, message: e.data.message } };
    case 'state':
      return m;
  }
}

export function useChat(threadId: string) {
  const { t } = useI18n();
  const [messages, setMessages] = React.useState<ChatMessage[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const [streaming, setStreaming] = React.useState(false);
  const [blocked, setBlocked] = React.useState<AiErrorCode | null>(null);
  const runRef = React.useRef<Run | null>(null);
  const sendingRef = React.useRef(false);

  const detach = React.useCallback(() => {
    runRef.current?.controller.abort();
    runRef.current = null;
  }, []);

  const follow = React.useCallback(
    async (run: Run) => {
      const { signal } = run.controller;
      let settled = false;
      let stale = false;
      let attempt = 0;
      while (!settled && !signal.aborted) {
        try {
          await streamRun(threadId, run.seq, signal, (frame) => {
            attempt = 0;
            if (frame.event === 'state') {
              settled = stale = true;
              return;
            }
            if (frame.event === 'error' && SETUP_CODES.includes(frame.data.code)) {
              setBlocked(frame.data.code);
              void refreshAiStatus().catch(() => undefined);
            }
            const fresh = run.fresh;
            setMessages((prev) =>
              prev.map((m) =>
                m.id === run.messageId
                  ? applyFrame(fresh ? { ...m, content: '', tools: [] } : m, frame, threadId)
                  : m,
              ),
            );
            run.fresh = false;
            run.seq = frame.seq;
            if (frame.event === 'done' || frame.event === 'error') settled = true;
          });
        } catch (e) {
          if (signal.aborted) return;
          if (e instanceof ApiError && e.status < 500 && e.status !== 429) {
            handleAiException(e, t);
            settled = stale = true;
          }
        }
        if (!settled) await wait(Math.min(1000 * 2 ** attempt++, MAX_BACKOFF_MS), signal);
      }
      if (signal.aborted || runRef.current !== run) return;
      runRef.current = null;
      setStreaming(false);
      if (!stale) return;
      try {
        setMessages(await api.get<AiMessage[]>(`ai/threads/${threadId}/messages`));
      } catch {
        return;
      }
    },
    [threadId, t],
  );

  const attach = React.useCallback(
    (messageId: string, fresh: boolean) => {
      detach();
      const run: Run = { messageId, seq: 0, fresh, controller: new AbortController() };
      runRef.current = run;
      setStreaming(true);
      void follow(run);
    },
    [detach, follow],
  );

  const reattach = React.useCallback(() => {
    const run = runRef.current;
    if (!run) return;
    run.controller.abort();
    const next = { ...run, controller: new AbortController() };
    runRef.current = next;
    void follow(next);
  }, [follow]);

  const load = React.useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const rows = await api.get<AiMessage[]>(`ai/threads/${threadId}/messages`);
      setMessages(rows);
      const last = rows[rows.length - 1];
      if (last?.role === 'assistant' && last.status === 'running') attach(last.id, true);
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : 'Error');
    } finally {
      setLoading(false);
    }
  }, [threadId, attach]);

  React.useEffect(() => {
    void load();
    return detach;
  }, [load, detach]);

  React.useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') reattach();
    });
    return () => sub.remove();
  }, [reattach]);

  const focused = React.useRef(false);
  useFocusEffect(
    React.useCallback(() => {
      if (focused.current) reattach();
      focused.current = true;
    }, [reattach]),
  );

  const send = React.useCallback(
    async (content: string): Promise<boolean> => {
      const text = content.trim();
      if (!text || runRef.current || sendingRef.current) return false;
      if (!(await ensureConsent().catch(() => false))) return false;
      sendingRef.current = true;

      const stamp = Date.now();
      const userId = `local-user-${stamp}`;
      const replyId = `local-reply-${stamp}`;
      const now = new Date().toISOString();
      const base = { threadId, actions: [], createdAt: now, error: null };
      setBlocked(null);
      setStreaming(true);
      setMessages((prev) => [
        ...prev,
        { ...base, id: userId, role: 'user', content: text, status: 'done' },
        { ...base, id: replyId, role: 'assistant', content: '', status: 'running' },
      ]);

      try {
        const sent = await api.post<AiSendMessageResponse>(`ai/threads/${threadId}/messages`, {
          content: text,
        });
        setMessages((prev) =>
          prev.map((m) =>
            m.id === userId
              ? { ...m, id: sent.userMessageId }
              : m.id === replyId
                ? { ...m, id: sent.messageId }
                : m,
          ),
        );
        attach(sent.messageId, false);
        return true;
      } catch (e) {
        setMessages((prev) => prev.filter((m) => m.id !== userId && m.id !== replyId));
        setStreaming(false);
        const code = aiErrorCode(e);
        if (code && SETUP_CODES.includes(code)) setBlocked(code);
        handleAiException(e, t);
        return false;
      } finally {
        sendingRef.current = false;
      }
    },
    [threadId, t, attach],
  );

  const stop = React.useCallback(() => {
    if (!runRef.current) return;
    api.post(`ai/threads/${threadId}/stop`).catch((e: unknown) => handleAiException(e, t));
  }, [threadId, t]);

  const updateAction = React.useCallback((action: AiPendingAction) => {
    setMessages((prev) =>
      prev.map((m) =>
        m.actions.some((a) => a.id === action.id)
          ? { ...m, actions: m.actions.map((a) => (a.id === action.id ? action : a)) }
          : m,
      ),
    );
  }, []);

  return {
    messages,
    loading,
    loadError,
    reload: load,
    streaming,
    blocked,
    send,
    stop,
    updateAction,
  };
}
