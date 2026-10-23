import { useEffect } from 'react';
import { syncTimeZone } from '@/lib/timezone-sync';

export function TimeZoneSync() {
  useEffect(() => {
    syncTimeZone().catch((error: unknown) => console.warn('Failed to sync time zone', error));
  }, []);

  return null;
}
