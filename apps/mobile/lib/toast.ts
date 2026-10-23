import * as React from 'react';

export type ToastVariant = 'error' | 'success';
export type Toast = { id: number; message: string; variant: ToastVariant };

const DURATION_MS = 3500;

let current: Toast | null = null;
let nextId = 1;
let timer: ReturnType<typeof setTimeout> | undefined;
const listeners = new Set<() => void>();

function emit(value: Toast | null) {
  current = value;
  listeners.forEach((l) => l());
}

export function dismissToast() {
  clearTimeout(timer);
  emit(null);
}

function show(message: string, variant: ToastVariant) {
  clearTimeout(timer);
  emit({ id: nextId++, message, variant });
  timer = setTimeout(() => emit(null), DURATION_MS);
}

export const toast = {
  error: (message: string) => show(message, 'error'),
  success: (message: string) => show(message, 'success'),
};

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function useToast() {
  return React.useSyncExternalStore(subscribe, () => current);
}
