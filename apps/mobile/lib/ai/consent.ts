import * as React from 'react';
import { getAiStatus, refreshAiStatus } from '~/lib/ai/status';

let open = false;
let pending: Promise<boolean> | null = null;
let resolvePending: ((accepted: boolean) => void) | null = null;
const listeners = new Set<() => void>();

function setOpen(next: boolean) {
  open = next;
  listeners.forEach((l) => l());
}

export function requestConsent(): Promise<boolean> {
  if (pending) return pending;
  pending = new Promise<boolean>((resolve) => {
    resolvePending = resolve;
  });
  setOpen(true);
  return pending;
}

export function settleConsent(accepted: boolean) {
  resolvePending?.(accepted);
  resolvePending = null;
  pending = null;
  setOpen(false);
}

export async function ensureConsent(): Promise<boolean> {
  const status = getAiStatus() ?? (await refreshAiStatus());
  return status.consentGiven || requestConsent();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function useConsentOpen() {
  return React.useSyncExternalStore(subscribe, () => open);
}
