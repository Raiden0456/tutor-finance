import type { ReactNode } from 'react';
import { FadeSwap } from '@/components/ui/collapse';

export function PageHeader({
  title,
  subtitle,
  action,
  actionKey,
}: {
  title: string;
  subtitle?: ReactNode;
  action?: ReactNode;
  actionKey?: string;
}) {
  return (
    <header className="flex min-h-9 items-center justify-between gap-3">
      <div className="min-w-0">
        <h1 className="hidden text-xl font-semibold tracking-tight md:block">{title}</h1>
        {subtitle && <p className="truncate text-xs text-muted-foreground">{subtitle}</p>}
      </div>
      {action && (
        <FadeSwap motionKey={actionKey ?? 'action'} className="shrink-0">
          {action}
        </FadeSwap>
      )}
    </header>
  );
}
