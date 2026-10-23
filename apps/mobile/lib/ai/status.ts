import * as React from 'react';
import { useFocusEffect } from 'expo-router';
import type { AiStatusResponse } from '@tutor-finance/shared';
import { api } from '~/lib/api';

let current: AiStatusResponse | null = null;
const listeners = new Set<() => void>();

export function setAiStatus(next: AiStatusResponse) {
  current = next;
  listeners.forEach((l) => l());
}

export async function refreshAiStatus(): Promise<AiStatusResponse> {
  const next = await api.get<AiStatusResponse>('ai/status');
  setAiStatus(next);
  return next;
}

export function getAiStatus() {
  return current;
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function useAiStatus() {
  const status = React.useSyncExternalStore(subscribe, () => current);
  const [error, setError] = React.useState<string | null>(null);

  const refresh = React.useCallback(async () => {
    setError(null);
    try {
      await refreshAiStatus();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error');
    }
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      void refresh();
    }, [refresh]),
  );

  return { status, error, refresh };
}
