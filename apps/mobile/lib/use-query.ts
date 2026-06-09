import * as React from 'react';
import { useFocusEffect } from 'expo-router';

/**
 * Minimal data hook: runs `fn` on mount / when deps change / on screen focus,
 * tracking loading + error, and exposes a manual `refetch` (for pull-to-refresh).
 */
export function useApiQuery<T>(fn: () => Promise<T>, deps: React.DependencyList = []) {
  const [data, setData] = React.useState<T | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const fnRef = React.useRef(fn);
  fnRef.current = fn;

  const run = React.useCallback(async () => {
    setError(null);
    try {
      const result = await fnRef.current();
      setData(result);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error');
    } finally {
      setLoading(false);
    }
  }, deps);

  React.useEffect(() => {
    setLoading(true);
    void run();
  }, [run]);

  useFocusEffect(
    React.useCallback(() => {
      void run();
    }, [run]),
  );

  return { data, loading, error, refetch: run, setData };
}
