import { useState, type ReactNode } from 'react';
import { motion } from 'motion/react';
import { ChevronDown } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { cn } from '@/lib/utils';

const EASE = [0.22, 1, 0.36, 1] as const;

export function MoreFields({
  children,
  defaultOpen = false,
  className,
}: {
  children: ReactNode;
  defaultOpen?: boolean;
  className?: string;
}) {
  const { t } = useI18n();
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex items-center gap-1 text-sm font-medium text-muted-foreground transition-colors duration-200 hover:text-foreground"
      >
        {open ? t('Fewer options') : t('More options')}
        <motion.span
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ duration: 0.2, ease: EASE }}
        >
          <ChevronDown className="h-4 w-4" />
        </motion.span>
      </button>
      {/* Kept mounted while collapsed so uncontrolled inputs still submit with the form. */}
      <motion.div
        initial={false}
        animate={{ height: open ? 'auto' : 0, opacity: open ? 1 : 0 }}
        transition={{ duration: 0.25, ease: EASE }}
        className="overflow-hidden"
        inert={!open}
      >
        <div className={cn('grid gap-4 px-0.5 pb-0.5 pt-4', className)}>{children}</div>
      </motion.div>
    </div>
  );
}
