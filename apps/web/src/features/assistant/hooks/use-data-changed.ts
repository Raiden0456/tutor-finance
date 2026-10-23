import { useEffect, useRef } from 'react';
import { DATA_CHANGED_EVENT } from '../utils/events';

export function useDataChanged(handler: () => void) {
  const ref = useRef(handler);
  useEffect(() => {
    ref.current = handler;
  });
  useEffect(() => {
    const listener = () => ref.current();
    window.addEventListener(DATA_CHANGED_EVENT, listener);
    return () => window.removeEventListener(DATA_CHANGED_EVENT, listener);
  }, []);
}
