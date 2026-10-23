import * as React from 'react';
import { useFocusEffect } from 'expo-router';

export function useApiQuery<T>(fn: () => Promise<T>, deps: React.DependencyList = []) {
  const [data, setData] = React.useState<T | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const fnRef = React.useRef(fn);
  fnRef.current = fn;

  const run = React.useCallback(async () => {
    setLoading(true);
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

  useFocusEffect(
    React.useCallback(() => {
      void run();
    }, [run]),
  );

  return { data, loading, error, refetch: run, setData };
}
