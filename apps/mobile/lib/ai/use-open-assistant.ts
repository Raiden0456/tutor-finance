import { useRouter } from 'expo-router';
import type { AiThread } from '@tutor-finance/shared';
import { api } from '~/lib/api';
import { ensureConsent } from '~/lib/ai/consent';
import { useMutation } from '~/lib/use-mutation';

type OpenOptions = { studentId?: string; studentName?: string; prompt?: string };

async function latestOrNewThread(studentId?: string): Promise<AiThread> {
  if (studentId) {
    const [latest] = await api.get<AiThread[]>('ai/threads', { query: { studentId } });
    if (latest) return latest;
  }
  return api.post<AiThread>('ai/threads', studentId ? { studentId } : {});
}

export function useOpenAssistant() {
  const router = useRouter();

  return useMutation(async ({ studentId, studentName, prompt }: OpenOptions = {}) => {
    if (!(await ensureConsent())) return;
    const thread = await latestOrNewThread(studentId);
    router.push({
      pathname: '/assistant/[threadId]',
      params: {
        threadId: thread.id,
        ...(studentId ? { studentId } : {}),
        ...(studentName ? { studentName } : {}),
        ...(prompt ? { prompt } : {}),
      },
    });
  });
}
