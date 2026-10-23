import { useCallback, useState } from 'react';
import { toast } from 'sonner';
import { ApiError } from '@/lib/api';
import { useI18n, type TFunction } from '@/lib/i18n';

export function errorMessage(error: unknown, t: TFunction): string {
  return error instanceof ApiError ? error.message : t('Something went wrong');
}

export function useMutation() {
  const { t } = useI18n();
  const [inFlight, setInFlight] = useState(0);

  const run = useCallback(
    async (fn: () => Promise<unknown>): Promise<boolean> => {
      setInFlight((n) => n + 1);
      try {
        await fn();
        return true;
      } catch (error) {
        toast.error(errorMessage(error, t));
        return false;
      } finally {
        setInFlight((n) => n - 1);
      }
    },
    [t],
  );

  return { run, pending: inFlight > 0 };
}
