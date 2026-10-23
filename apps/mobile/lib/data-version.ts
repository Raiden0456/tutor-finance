import * as React from 'react';

let version = 0;
const listeners = new Set<() => void>();

export function bumpDataVersion() {
  version += 1;
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function useDataVersion() {
  return React.useSyncExternalStore(subscribe, () => version);
}
