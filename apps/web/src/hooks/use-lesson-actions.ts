import { useCallback } from 'react';
import { api } from '@/lib/api';
import type { Lesson } from '@/lib/types';
import { useMutation } from './use-mutation';

export type LessonPatch = Partial<
  Pick<Lesson, 'status' | 'startsAt' | 'durationMin' | 'paidAmount' | 'priceOverride'>
> & { notes?: string | null; homework?: string | null; meetingLink?: string | null };

export function useLessonActions(lessonId: string, onUpdated: (lesson: Lesson) => void) {
  const { run, pending } = useMutation();

  const update = useCallback(
    (patch: LessonPatch) =>
      run(async () => onUpdated(await api.patch<Lesson>(`/lessons/${lessonId}`, patch))),
    [run, lessonId, onUpdated],
  );

  const archive = useCallback(
    () => run(() => api.post(`/lessons/${lessonId}/archive`)),
    [run, lessonId],
  );

  const remove = useCallback(() => run(() => api.delete(`/lessons/${lessonId}`)), [run, lessonId]);

  return {
    pending,
    update,
    archive,
    remove,
    complete: () => update({ status: 'completed' }),
    markPaid: () => update({ status: 'paid' }),
    markNoShow: () => update({ status: 'no_show' }),
    cancel: () => update({ status: 'cancelled' }),
    partialPay: (paidAmount: number) => update({ status: 'partially_paid', paidAmount }),
  };
}

export type LessonActions = ReturnType<typeof useLessonActions>;
