import * as React from 'react';
import { errorMessage, isUnauthorized } from '~/lib/api';
import { useI18n } from '~/lib/i18n';
import { toast } from '~/lib/toast';

export function useMutation<A extends unknown[], R>(
  fn: (...args: A) => Promise<R>,
  options: { onError?: (message: string) => void } = {},
) {
  const { t } = useI18n();
  const [pending, setPending] = React.useState(false);
  const pendingRef = React.useRef(false);
  const fnRef = React.useRef(fn);
  fnRef.current = fn;
  const onErrorRef = React.useRef(options.onError);
  onErrorRef.current = options.onError;

  const run = React.useCallback(
    async (...args: A): Promise<R | undefined> => {
      if (pendingRef.current) return undefined;
      pendingRef.current = true;
      setPending(true);
      try {
        return await fnRef.current(...args);
      } catch (e) {
        if (isUnauthorized(e)) return undefined;
        const message = errorMessage(e, t('Something went wrong'));
        if (onErrorRef.current) onErrorRef.current(message);
        else toast.error(message);
        return undefined;
      } finally {
        pendingRef.current = false;
        setPending(false);
      }
    },
    [t],
  );

  return { run, pending };
}
