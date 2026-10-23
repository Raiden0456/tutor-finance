import { useEffect, useRef, useState } from 'react';
import { aiErrorMessageKey, type AiPendingAction } from '@tutor-finance/shared';
import { AnimatePresence, motion } from 'motion/react';
import { AlertCircle, CheckCheck } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Collapse } from '@/components/ui/collapse';
import { Spinner } from '@/components/ui/spinner';
import { useI18n } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { integrationsPath } from '../hooks/use-ai-error-handler';
import type { ChatMessage } from '../types/chat';
import { ActionCard } from './action-card';
import { MarkdownText } from './markdown';
import { ToolChips } from './tool-chips';

const SETTINGS_ERRORS = new Set(['AI_NOT_CONFIGURED', 'AI_RECONNECT_REQUIRED']);

function TypingDots() {
  return (
    <span className="inline-flex gap-1 py-1.5" aria-hidden>
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground/60"
          style={{ animationDelay: `${i * 120}ms` }}
        />
      ))}
    </span>
  );
}

type DecideFn = (action: AiPendingAction, confirm: boolean) => Promise<AiPendingAction | null>;
type ConfirmAllFn = (ids: string[]) => Promise<AiPendingAction[] | null>;

function ConfirmAllButton({
  actions,
  hidden,
  onConfirmAll,
}: {
  actions: AiPendingAction[];
  hidden: boolean;
  onConfirmAll: ConfirmAllFn;
}) {
  const { t } = useI18n();
  const [busy, setBusy] = useState(false);
  const pending = actions.filter((a) => a.status === 'pending');

  async function confirmAll() {
    setBusy(true);
    const updated = await onConfirmAll(pending.map((a) => a.id));
    setBusy(false);
    if (!updated) return;
    if (updated.some((a) => a.status === 'failed')) toast.error(t('Could not apply the change'));
    else if (updated.every((a) => a.status !== 'pending')) toast.success(t('Change applied'));
  }

  return (
    <Collapse open={!hidden && pending.length >= 2}>
      <Button size="sm" className="w-full" disabled={busy} onClick={() => void confirmAll()}>
        {busy ? <Spinner /> : <CheckCheck className="h-4 w-4" />}
        {t('Confirm all')} · {pending.length}
      </Button>
    </Collapse>
  );
}

function AssistantMessage({
  message,
  onDecide,
  onConfirmAll,
}: {
  message: ChatMessage;
  onDecide: DecideFn;
  onConfirmAll: ConfirmAllFn;
}) {
  const { t, locale } = useI18n();
  const empty = !message.content && message.actions.length === 0;
  const running = message.status === 'running';
  return (
    <div className="space-y-2">
      {message.tools && message.tools.length > 0 && <ToolChips tools={message.tools} />}
      {message.content ? (
        <MarkdownText>{message.content}</MarkdownText>
      ) : running ? (
        <TypingDots />
      ) : null}
      {message.actions.map((action) => (
        <ActionCard key={action.id} action={action} onDecide={onDecide} />
      ))}
      <ConfirmAllButton actions={message.actions} hidden={running} onConfirmAll={onConfirmAll} />
      <Collapse open={(message.status === 'stopped' && empty) || message.status === 'interrupted'}>
        <p className="text-xs text-muted-foreground">
          {message.status === 'interrupted'
            ? t('The answer was interrupted. Ask again.')
            : t('Stopped')}
        </p>
      </Collapse>
      {message.status === 'error' && message.error && (
        <div className="flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <div className="min-w-0 space-y-1">
            <p className="break-words">{t(aiErrorMessageKey(message.error))}</p>
            {SETTINGS_ERRORS.has(message.error.code) && (
              <a
                href={integrationsPath(locale)}
                className="font-medium underline underline-offset-2"
              >
                {t('Open settings')}
              </a>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export function MessageList({
  messages,
  onDecide,
  onConfirmAll,
}: {
  messages: ChatMessage[];
  onDecide: DecideFn;
  onConfirmAll: ConfirmAllFn;
}) {
  const endRef = useRef<HTMLDivElement>(null);
  const last = messages[messages.length - 1];

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'end', behavior: 'smooth' });
  }, [messages.length, last?.content, last?.tools?.length, last?.actions.length]);

  return (
    <div className="space-y-4">
      <AnimatePresence initial={false}>
        {messages.map((message) => (
          <motion.div
            key={message.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
            className={cn(message.role === 'user' && 'flex justify-end')}
          >
            {message.role === 'user' ? (
              <div className="max-w-[85%] whitespace-pre-wrap break-words rounded-2xl rounded-br-md bg-primary px-3.5 py-2 text-sm text-primary-foreground">
                {message.content}
              </div>
            ) : (
              <AssistantMessage message={message} onDecide={onDecide} onConfirmAll={onConfirmAll} />
            )}
          </motion.div>
        ))}
      </AnimatePresence>
      <div ref={endRef} />
    </div>
  );
}
