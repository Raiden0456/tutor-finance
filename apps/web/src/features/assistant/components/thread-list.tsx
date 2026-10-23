import type { AiThread } from '@tutor-finance/shared';
import { AnimatePresence, motion } from 'motion/react';
import { MessageSquare, Trash2, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { FadeSwap } from '@/components/ui/collapse';
import { useI18n } from '@/lib/i18n';
import { cn } from '@/lib/utils';

export function ThreadList({
  threads,
  loading,
  activeId,
  activeRunning,
  onOpen,
  onDelete,
}: {
  threads: AiThread[];
  loading: boolean;
  activeId: string | null;
  activeRunning: boolean;
  onOpen: (thread: AiThread) => void;
  onDelete: (thread: AiThread) => void;
}) {
  const { t, locale } = useI18n();
  const formatter = new Intl.DateTimeFormat(locale, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const running = (thread: AiThread) => (thread.id === activeId ? activeRunning : thread.running);

  const state = loading && threads.length === 0 ? 'loading' : threads.length ? 'list' : 'empty';

  return (
    <FadeSwap motionKey={state}>
      {state === 'loading' ? (
        <div className="space-y-2">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-14 rounded-xl" />
          ))}
        </div>
      ) : state === 'empty' ? (
        <p className="py-10 text-center text-sm text-muted-foreground">{t('No chats yet')}</p>
      ) : (
        <ul className="space-y-1.5">
          <AnimatePresence initial={false}>
            {threads.map((thread) => (
              <motion.li
                key={thread.id}
                layout
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2 }}
                className={cn(
                  'group flex items-center gap-2 rounded-xl border px-3 py-2.5 transition-colors duration-200',
                  thread.id === activeId
                    ? 'border-primary/40 bg-primary/5'
                    : 'border-border hover:bg-accent',
                )}
              >
                <button
                  type="button"
                  onClick={() => onOpen(thread)}
                  className="flex min-w-0 flex-1 items-center gap-2.5 text-left"
                >
                  {thread.studentId ? (
                    <User className="h-4 w-4 shrink-0 text-muted-foreground" />
                  ) : (
                    <MessageSquare className="h-4 w-4 shrink-0 text-muted-foreground" />
                  )}
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium">
                      {thread.title || t('New chat')}
                    </span>
                    <FadeSwap
                      motionKey={running(thread) ? 'running' : 'idle'}
                      className="block text-xs text-muted-foreground"
                    >
                      {running(thread) ? (
                        <span className="inline-flex items-center gap-1.5 text-primary">
                          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary" />
                          {t('Answering…')}
                        </span>
                      ) : (
                        formatter.format(new Date(thread.updatedAt))
                      )}
                    </FadeSwap>
                  </span>
                </button>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label={t('Delete chat')}
                  onClick={() => onDelete(thread)}
                  className="shrink-0 text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </motion.li>
            ))}
          </AnimatePresence>
        </ul>
      )}
    </FadeSwap>
  );
}
