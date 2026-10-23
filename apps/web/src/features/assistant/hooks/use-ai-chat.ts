import { useCallback, useEffect, useRef, useState } from 'react';
import type { AiPendingAction, AiStreamFrame, AiThread } from '@tutor-finance/shared';
import { ApiError } from '@/lib/api';
import { aiApi, streamRun } from '../api';
import type { ChatMessage, ToolActivity } from '../types/chat';
import { notifyDataChanged } from '../utils/events';

const THREAD_KEY = 'assistant:thread';
const MAX_BACKOFF_MS = 15_000;

let localSeq = 0;
const localId = (prefix: string) => `${prefix}-${++localSeq}`;

interface Run {
  threadId: string;
  messageId: string;
  seq: number;
  fresh: boolean;
  controller: AbortController;
}

export function storedThreadId(): string | null {
  try {
    return sessionStorage.getItem(THREAD_KEY);
  } catch {
    return null;
  }
}

function storeThreadId(id: string | null) {
  try {
    if (id) sessionStorage.setItem(THREAD_KEY, id);
    else sessionStorage.removeItem(THREAD_KEY);
  } catch {
    return;
  }
}

function wait(ms: number, signal: AbortSignal) {
  return new Promise<void>((resolve) => {
    const timer = setTimeout(resolve, ms);
    signal.addEventListener('abort', () => {
      clearTimeout(timer);
      resolve();
    });
  });
}

function applyTool(
  tools: ToolActivity[] = [],
  data: { name: string; status: ToolActivity['status'] },
) {
  if (data.status === 'started') return [...tools, { key: ++localSeq, ...data }];
  const index = tools.findLastIndex((tool) => tool.name === data.name && tool.status === 'started');
  if (index === -1) return [...tools, { key: ++localSeq, ...data }];
  return tools.map((tool, i) => (i === index ? { ...tool, status: data.status } : tool));
}

function applyFrame(message: ChatMessage, frame: AiStreamFrame, threadId: string): ChatMessage {
  switch (frame.event) {
    case 'delta':
      return { ...message, content: message.content + frame.data.text };
    case 'tool':
      return { ...message, tools: applyTool(message.tools, frame.data) };
    case 'action':
      if (message.actions.some((a) => a.id === frame.data.pendingActionId)) return message;
      return {
        ...message,
        actions: [
          ...message.actions,
          {
            id: frame.data.pendingActionId,
            threadId,
            tool: frame.data.tool,
            summary: frame.data.summary,
            args: frame.data.args,
            status: 'pending',
            result: null,
            createdAt: new Date().toISOString(),
          },
        ],
      };
    case 'done':
      return { ...message, status: frame.data.status };
    case 'error':
      return {
        ...message,
        status: 'error',
        error: { code: frame.data.code, message: frame.data.message },
      };
    case 'state':
      return message;
  }
}

export function useAiChat(onError: (error: unknown) => void, onSettled?: () => void) {
  const [thread, setThreadState] = useState<AiThread | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [streaming, setStreaming] = useState(false);
  const threadRef = useRef<AiThread | null>(null);
  const runRef = useRef<Run | null>(null);
  const sendingRef = useRef(false);
  const loadToken = useRef(0);
  const settledRef = useRef(onSettled);
  useEffect(() => {
    settledRef.current = onSettled;
  });

  const setThread = useCallback((next: AiThread | null) => {
    threadRef.current = next;
    setThreadState(next);
    storeThreadId(next?.id ?? null);
  }, []);

  const detach = useCallback(() => {
    runRef.current?.controller.abort();
    runRef.current = null;
  }, []);

  const loadMessages = useCallback(async (threadId: string) => {
    const rows = await aiApi.messages(threadId);
    return rows.map<ChatMessage>((m) => ({ ...m, tools: [] }));
  }, []);

  const follow = useCallback(
    async (run: Run) => {
      const { signal } = run.controller;
      const patch = (frame: AiStreamFrame) =>
        setMessages((prev) =>
          prev.map((m) => {
            if (m.id !== run.messageId) return m;
            const base = run.fresh ? { ...m, content: '', tools: [] } : m;
            return applyFrame(base, frame, run.threadId);
          }),
        );
      let settled = false;
      let stale = false;
      let attempt = 0;
      while (!settled && !signal.aborted) {
        try {
          await streamRun(
            run.threadId,
            run.seq,
            (frame) => {
              attempt = 0;
              if (frame.event === 'state') {
                settled = stale = true;
                return;
              }
              patch(frame);
              run.fresh = false;
              run.seq = frame.seq;
              if (frame.event === 'done' || frame.event === 'error') settled = true;
            },
            signal,
          );
        } catch (error) {
          if (signal.aborted) return;
          if (error instanceof ApiError && error.status < 500 && error.status !== 429) {
            onError(error);
            settled = stale = true;
          }
        }
        if (!settled) await wait(Math.min(1000 * 2 ** attempt++, MAX_BACKOFF_MS), signal);
      }
      if (signal.aborted || runRef.current !== run) return;
      runRef.current = null;
      setStreaming(false);
      settledRef.current?.();
      if (!stale) return;
      try {
        const rows = await loadMessages(run.threadId);
        if (threadRef.current?.id === run.threadId && !runRef.current) setMessages(rows);
      } catch (error) {
        onError(error);
      }
    },
    [onError, loadMessages],
  );

  const attach = useCallback(
    (threadId: string, messageId: string, fresh: boolean) => {
      detach();
      const run: Run = { threadId, messageId, seq: 0, fresh, controller: new AbortController() };
      runRef.current = run;
      setStreaming(true);
      void follow(run);
    },
    [detach, follow],
  );

  const reattach = useCallback(() => {
    const run = runRef.current;
    if (!run) return;
    run.controller.abort();
    const next = { ...run, controller: new AbortController() };
    runRef.current = next;
    void follow(next);
  }, [follow]);

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible') reattach();
    };
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('online', reattach);
    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('online', reattach);
      detach();
    };
  }, [reattach, detach]);

  const openThread = useCallback(
    async (next: AiThread | null) => {
      detach();
      setStreaming(false);
      setThread(next);
      const token = ++loadToken.current;
      setMessages([]);
      if (!next) return;
      setLoading(true);
      try {
        const rows = await loadMessages(next.id);
        if (token !== loadToken.current) return;
        setMessages(rows);
        const last = rows[rows.length - 1];
        if (last?.role === 'assistant' && last.status === 'running') attach(next.id, last.id, true);
      } catch (error) {
        if (token === loadToken.current) onError(error);
      } finally {
        if (token === loadToken.current) setLoading(false);
      }
    },
    [onError, setThread, detach, loadMessages, attach],
  );

  const send = useCallback(
    async (content: string, studentId?: string): Promise<boolean> => {
      const text = content.trim();
      if (!text || runRef.current || sendingRef.current) return false;
      sendingRef.current = true;
      setStreaming(true);
      const userId = localId('user');
      const assistantId = localId('assistant');
      setMessages((prev) => [
        ...prev,
        { id: userId, role: 'user', content: text, actions: [], status: 'done', error: null },
        {
          id: assistantId,
          role: 'assistant',
          content: '',
          actions: [],
          tools: [],
          status: 'running',
          error: null,
        },
      ]);

      try {
        let current = threadRef.current;
        if (!current) {
          current = await aiApi.createThread({ studentId, title: text.slice(0, 80) });
          loadToken.current++;
          setThread(current);
        }
        const sent = await aiApi.sendMessage(current.id, text);
        setMessages((prev) =>
          prev.map((m) =>
            m.id === userId
              ? { ...m, id: sent.userMessageId }
              : m.id === assistantId
                ? { ...m, id: sent.messageId }
                : m,
          ),
        );
        attach(current.id, sent.messageId, false);
        return true;
      } catch (error) {
        setMessages((prev) => prev.filter((m) => m.id !== userId && m.id !== assistantId));
        setStreaming(false);
        onError(error);
        return false;
      } finally {
        sendingRef.current = false;
      }
    },
    [onError, setThread, attach],
  );

  const stop = useCallback(async () => {
    const run = runRef.current;
    if (!run) return;
    try {
      await aiApi.stopRun(run.threadId);
    } catch (error) {
      onError(error);
    }
  }, [onError]);

  const applyActions = useCallback((updated: AiPendingAction[]) => {
    const byId = new Map(updated.map((a) => [a.id, a]));
    setMessages((prev) =>
      prev.map((m) => ({ ...m, actions: m.actions.map((a) => byId.get(a.id) ?? a) })),
    );
  }, []);

  const decide = useCallback(
    async (action: AiPendingAction, confirm: boolean) => {
      try {
        const updated = confirm
          ? await aiApi.confirmAction(action.id)
          : await aiApi.rejectAction(action.id);
        applyActions([updated]);
        if (updated.status === 'confirmed') notifyDataChanged();
        return updated;
      } catch (error) {
        onError(error);
        return null;
      }
    },
    [onError, applyActions],
  );

  const confirmAll = useCallback(
    async (ids: string[]) => {
      try {
        const updated = await aiApi.confirmAllActions(ids);
        applyActions(updated);
        if (updated.some((a) => a.status === 'confirmed')) notifyDataChanged();
        return updated;
      } catch (error) {
        onError(error);
        return null;
      }
    },
    [onError, applyActions],
  );

  return { thread, messages, loading, streaming, openThread, send, stop, decide, confirmAll };
}
