import { useEffect, useState, type ReactNode } from 'react';
import { cn } from '@/lib/utils';

/**
 * Smooth show/hide using the CSS grid `grid-rows-[0fr → 1fr]` trick.
 * Keeps last children mounted during exit so text doesn't disappear before the
 * collapse finishes. Pure CSS — no AnimatePresence required.
 */
export function Collapse({
  open,
  children,
  className,
  duration = 300,
}: {
  open: boolean;
  children: ReactNode;
  className?: string;
  duration?: number;
}) {
  const [cached, setCached] = useState<ReactNode>(children);

  useEffect(() => {
    if (open) setCached(children);
  }, [open, children]);

  return (
    <div
      className={cn(
        'grid transition-[grid-template-rows,opacity] ease-out',
        open ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0',
        className,
      )}
      style={{ transitionDuration: `${duration}ms` }}
      aria-hidden={!open}
    >
      <div className="min-h-0 overflow-hidden">{open ? children : cached}</div>
    </div>
  );
}
