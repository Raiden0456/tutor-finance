import { useCallback, useEffect, useRef, useState } from 'react';
import type { AiThread } from '@tutor-finance/shared';
import { History, Settings, Sparkles, SquarePen, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { FadeSwap } from '@/components/ui/collapse';
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerTitle,
} from '@/components/ui/drawer';
import { Skeleton } from '@/components/ui/skeleton';
import { useMediaQuery } from '@/hooks/use-media-query';
import { I18nProvider, useI18n, type Locale } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { storedThreadId, useAiChat } from '../hooks/use-ai-chat';
import { integrationsPath, useAiErrorHandler } from '../hooks/use-ai-error-handler';
import { useAiStatus } from '../hooks/use-ai-status';
import { latestStudentThread, useAiThreads } from '../hooks/use-ai-threads';
import { loadAiStatus, requestConsent } from '../stores/ai-status';
import { ASSISTANT_OPEN_EVENT, type AssistantOpenRequest } from '../utils/events';
import { GENERAL_PROMPTS, STUDENT_PROMPTS } from '../utils/prompts';
import { ChatInput } from './chat-input';
import { ConsentDialog } from './consent-dialog';
import { MessageList } from './message-list';
import { PromptChips } from './prompt-chips';
import { ThreadList } from './thread-list';

export function AssistantRoot({ locale = 'en' }: { locale?: Locale }) {
  return (
    <I18nProvider locale={locale}>
      <AssistantShell />
      <ConsentDialog />
    </I18nProvider>
  );
}

function AssistantShell() {
  const { t, locale } = useI18n();
  const isDesktop = useMediaQuery('(min-width: 768px)');
  const handleError = useAiErrorHandler();
  const { threads, loading: threadsLoading, reload, remove } = useAiThreads(handleError);
  const chat = useAiChat(handleError, reload);
  const { send: sendToChat, openThread: openChatThread, thread: chatThread } = chat;
  const { status } = useAiStatus();
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<'chat' | 'threads'>('chat');
  const [preparing, setPreparing] = useState(false);
  const notConfigured = !!status && !status.activeProvider;

  const send = useCallback(
    async (content: string) => {
      const ok = await sendToChat(content);
      void reload();
      return ok;
    },
    [sendToChat, reload],
  );

  const handleOpen = useCallback(
    async (request: AssistantOpenRequest) => {
      const current = await loadAiStatus();
      if (current && !current.consentGiven && !(await requestConsent())) return;
      setOpen(true);
      setView('chat');
      const list = reload();
      if (!request.studentId && !request.prompt) {
        const storedId = chatThread ? null : storedThreadId();
        const stored = storedId && (await list).find((thread) => thread.id === storedId);
        if (stored) void openChatThread(stored);
        return;
      }
      if (!current?.activeProvider) return;
      setPreparing(true);
      try {
        await openChatThread(
          request.studentId
            ? await latestStudentThread(request.studentId, request.studentName)
            : null,
        );
      } catch (error) {
        handleError(error);
        return;
      } finally {
        setPreparing(false);
      }
      if (request.prompt) void send(request.prompt);
    },
    [openChatThread, chatThread, handleError, reload, send],
  );

  const handleOpenRef = useRef(handleOpen);
  useEffect(() => {
    handleOpenRef.current = handleOpen;
  });
  useEffect(() => {
    const listener = (event: Event) =>
      void handleOpenRef.current((event as CustomEvent<AssistantOpenRequest>).detail ?? {});
    window.addEventListener(ASSISTANT_OPEN_EVENT, listener);
    return () => window.removeEventListener(ASSISTANT_OPEN_EVENT, listener);
  }, []);

  function openThread(thread: AiThread | null) {
    setView('chat');
    void chat.openThread(thread);
  }

  async function deleteThread(thread: AiThread) {
    if ((await remove(thread.id)) && chat.thread?.id === thread.id) void chat.openThread(null);
  }

  const bodyKey =
    view === 'threads'
      ? 'threads'
      : preparing || chat.loading
        ? 'loading'
        : chat.messages.length === 0
          ? 'empty'
          : 'chat';

  return (
    <Drawer open={open} onOpenChange={setOpen} direction={isDesktop ? 'right' : 'bottom'}>
      <DrawerContent
        className={cn(
          'data-[vaul-drawer-direction=bottom]:h-[92dvh] data-[vaul-drawer-direction=bottom]:max-h-[92dvh]',
          'data-[vaul-drawer-direction=right]:w-full data-[vaul-drawer-direction=right]:sm:max-w-md',
        )}
      >
        <div className="flex items-center gap-2 border-b border-border px-4 py-3">
          <Sparkles className="h-5 w-5 shrink-0 text-primary" />
          <div className="min-w-0 flex-1">
            <DrawerTitle className="truncate text-base">
              {view === 'threads' ? t('Recent chats') : chat.thread?.title || t('Assistant')}
            </DrawerTitle>
            <DrawerDescription className="sr-only">
              {t('Ask about your lessons, students and finances.')}
            </DrawerDescription>
          </div>
          <Button
            variant={view === 'threads' ? 'secondary' : 'ghost'}
            size="icon-sm"
            aria-label={t('Recent chats')}
            onClick={() => setView((v) => (v === 'threads' ? 'chat' : 'threads'))}
          >
            <History className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={t('New chat')}
            onClick={() => openThread(null)}
          >
            <SquarePen className="h-4 w-4" />
          </Button>
          <DrawerClose asChild>
            <Button variant="ghost" size="icon-sm" aria-label={t('Close')}>
              <X className="h-4 w-4" />
            </Button>
          </DrawerClose>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4" data-vaul-no-drag>
          <FadeSwap motionKey={bodyKey}>
            {view === 'threads' ? (
              <ThreadList
                threads={threads}
                loading={threadsLoading}
                activeId={chat.thread?.id ?? null}
                activeRunning={chat.streaming}
                onOpen={openThread}
                onDelete={(thread) => void deleteThread(thread)}
              />
            ) : preparing || chat.loading ? (
              <div className="space-y-3">
                <Skeleton className="ml-auto h-9 w-2/3 rounded-2xl" />
                <Skeleton className="h-20 w-full rounded-xl" />
                <Skeleton className="ml-auto h-9 w-1/2 rounded-2xl" />
              </div>
            ) : chat.messages.length === 0 ? (
              <div className="flex flex-col items-center gap-4 py-8 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10">
                  <Sparkles className="h-6 w-6 text-primary" />
                </div>
                <div className="space-y-1">
                  <p className="font-semibold">{t('How can I help?')}</p>
                  <p className="text-sm text-muted-foreground">
                    {t('Ask about your lessons, students and finances.')}
                  </p>
                </div>
                <PromptChips
                  className="justify-center"
                  prompts={chat.thread?.studentId ? STUDENT_PROMPTS : GENERAL_PROMPTS}
                  disabled={notConfigured || chat.streaming}
                  onPick={(prompt) => void send(prompt)}
                />
              </div>
            ) : (
              <MessageList
                messages={chat.messages}
                onDecide={chat.decide}
                onConfirmAll={chat.confirmAll}
              />
            )}
          </FadeSwap>
        </div>

        <div
          className="border-t border-border px-4 pt-3"
          style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 12px)' }}
        >
          <FadeSwap motionKey={notConfigured ? 'cta' : 'input'}>
            {notConfigured ? (
              <div className="flex items-center gap-3 rounded-xl border border-dashed border-border p-3">
                <p className="min-w-0 flex-1 text-sm text-muted-foreground">
                  {t('Connect ChatGPT in Settings to start using the assistant.')}
                </p>
                <Button size="sm" asChild>
                  <a href={integrationsPath(locale)}>
                    <Settings className="h-4 w-4" />
                    {t('Open settings')}
                  </a>
                </Button>
              </div>
            ) : (
              <ChatInput
                streaming={chat.streaming}
                disabled={preparing}
                onSend={send}
                onStop={() => void chat.stop()}
              />
            )}
          </FadeSwap>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
