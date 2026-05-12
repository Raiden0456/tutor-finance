import type { ReactNode } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { cn } from '@/lib/utils';

const EASE = [0.22, 1, 0.36, 1] as const;

/**
 * Smooth collapse/expand using Motion. Animates height + opacity, exits gracefully.
 */
export function Collapse({
  open,
  children,
  className,
  duration = 0.25,
}: {
  open: boolean;
  children: ReactNode;
  className?: string;
  duration?: number;
}) {
  return (
    <AnimatePresence initial={false}>
      {open && (
        <motion.div
          key="collapse-content"
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration, ease: EASE }}
          className={cn('overflow-hidden', className)}
          aria-hidden={!open}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/**
 * Crossfade between mutually-exclusive states. Pass a stable `motionKey` that
 * changes when the content should swap.
 */
export function FadeSwap({
  motionKey,
  children,
  className,
  duration = 0.2,
}: {
  motionKey: string | number;
  children: ReactNode;
  className?: string;
  duration?: number;
}) {
  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={motionKey}
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -6 }}
        transition={{ duration, ease: EASE }}
        className={className}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
