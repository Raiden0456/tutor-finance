import { useEffect } from 'react';
import { useSession } from '@/lib/auth-client';

export function AuthGuard() {
  const { data, isPending } = useSession();

  useEffect(() => {
    if (!isPending && !data?.user) {
      window.location.href = '/login';
    }
  }, [data, isPending]);

  if (isPending || !data?.user) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-background transition-opacity duration-200">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return null;
}
