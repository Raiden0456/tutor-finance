import { useCallback, useState } from 'react';
import type { AiThread } from '@tutor-finance/shared';
import { aiApi } from '../api';

export function useAiThreads(onError: (error: unknown) => void) {
  const [threads, setThreads] = useState<AiThread[]>([]);
  const [loading, setLoading] = useState(false);

  const reload = useCallback(async (): Promise<AiThread[]> => {
    setLoading(true);
    try {
      const rows = await aiApi.threads();
      setThreads(rows);
      return rows;
    } catch (error) {
      onError(error);
      return [];
    } finally {
      setLoading(false);
    }
  }, [onError]);

  const remove = useCallback(
    async (id: string) => {
      try {
        await aiApi.deleteThread(id);
        setThreads((prev) => prev.filter((thread) => thread.id !== id));
        return true;
      } catch (error) {
        onError(error);
        return false;
      }
    },
    [onError],
  );

  return { threads, loading, reload, remove };
}

export async function latestStudentThread(studentId: string, title?: string): Promise<AiThread> {
  const [latest] = await aiApi.threads(studentId);
  return latest ?? aiApi.createThread({ studentId, title });
}
