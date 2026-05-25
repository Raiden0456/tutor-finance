import { useEffect, useRef } from 'react';
import { api, ApiError } from '@/lib/api';

const PUSH_TOKEN_MESSAGE = 'tutor-finance:expo-push-token';

type PushPlatform = 'ios' | 'android';

type PushTokenMessage = {
  type: typeof PUSH_TOKEN_MESSAGE;
  token: string;
  platform?: PushPlatform;
};

export function MobilePushBridge() {
  const lastRegisteredKey = useRef<string | null>(null);

  useEffect(() => {
    async function register(message: PushTokenMessage) {
      const key = `${message.token}:${message.platform ?? 'unknown'}`;
      if (lastRegisteredKey.current === key) return;
      lastRegisteredKey.current = key;

      try {
        await api.post('/device-tokens', {
          token: message.token,
          platform: message.platform,
        });
      } catch (err) {
        lastRegisteredKey.current = null;
        if (err instanceof ApiError && err.status === 401) return;
        console.warn('Failed to register mobile push token', err);
      }
    }

    function handleMessage(event: Event) {
      const data = 'data' in event ? (event as MessageEvent).data : undefined;
      const message = parsePushTokenMessage(data);
      if (!message) return;
      void register(message);
    }

    window.addEventListener('message', handleMessage);
    document.addEventListener('message', handleMessage);
    return () => {
      window.removeEventListener('message', handleMessage);
      document.removeEventListener('message', handleMessage);
    };
  }, []);

  return null;
}

function parsePushTokenMessage(data: unknown): PushTokenMessage | null {
  if (typeof data !== 'string') return null;

  let parsed: unknown;
  try {
    parsed = JSON.parse(data);
  } catch {
    return null;
  }

  if (!parsed || typeof parsed !== 'object') return null;
  const raw = parsed as Record<string, unknown>;
  if (raw.type !== PUSH_TOKEN_MESSAGE || typeof raw.token !== 'string') return null;

  const platform = raw.platform === 'ios' || raw.platform === 'android' ? raw.platform : undefined;
  return { type: PUSH_TOKEN_MESSAGE, token: raw.token, platform };
}
