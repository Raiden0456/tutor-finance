import { AnimatePresence, motion } from 'motion/react';
import { Check, Loader2, X } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import type { ToolActivity } from '../types/chat';
import { toolLabel } from '../utils/prompts';

export function ToolChips({ tools }: { tools: ToolActivity[] }) {
  const { t } = useI18n();
  return (
    <div className="flex flex-wrap gap-1.5">
      <AnimatePresence initial={false}>
        {tools.map((tool) => (
          <motion.span
            key={tool.key}
            layout
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.18 }}
            className={cn(
              'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] transition-colors duration-200',
              tool.status === 'failed'
                ? 'border-destructive/30 text-destructive'
                : 'border-border text-muted-foreground',
            )}
          >
            {tool.status === 'started' ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : tool.status === 'completed' ? (
              <Check className="h-3 w-3" />
            ) : (
              <X className="h-3 w-3" />
            )}
            {t(toolLabel(tool.name))}
            {tool.status === 'started' && '…'}
          </motion.span>
        ))}
      </AnimatePresence>
    </div>
  );
}
