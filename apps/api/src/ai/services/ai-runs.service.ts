import { HttpStatus, Inject, Injectable, Logger, type OnModuleInit } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import type {
  AiRunError,
  AiSendMessageResponse,
  AiStreamEvent,
  AiStreamFrame,
} from '@tutor-finance/shared';
import type { Database } from '../../db/client.js';
import { DB } from '../../db/db.module.js';
import { aiMessages } from '../../db/schema.js';
import { NotificationsService } from '../../notifications/notifications.service.js';
import { AiError } from '../utils/ai-error.js';
import { AiAgentService, type PreparedTurn } from './ai-agent.service.js';
import { AiThreadsService, type MessageRow } from './ai-threads.service.js';

type Subscriber = (frame: AiStreamFrame) => void;
type MessageUpdate = Partial<typeof aiMessages.$inferInsert>;

interface Run {
  userId: string;
  threadId: string;
  messageId: string;
  frames: AiStreamFrame[];
  subscribers: Set<Subscriber>;
  abort: AbortController;
  finished: boolean;
}

const FLUSH_MS = 500;
const GRACE_MS = 2 * 60_000;

export function isTerminal(frame: AiStreamEvent): boolean {
  return frame.event === 'done' || frame.event === 'error';
}

@Injectable()
export class AiRunsService implements OnModuleInit {
  private readonly logger = new Logger(AiRunsService.name);
  private readonly runs = new Map<string, Run>();
  private seq = 0;

  constructor(
    private readonly threads: AiThreadsService,
    private readonly agent: AiAgentService,
    private readonly notifications: NotificationsService,
    @Inject(DB) private readonly db: Database,
  ) {}

  async onModuleInit(): Promise<void> {
    const rows = await this.db
      .update(aiMessages)
      .set({ status: 'interrupted' })
      .where(eq(aiMessages.status, 'running'))
      .returning({ id: aiMessages.id });
    if (rows.length > 0)
      this.logger.warn(`Marked ${rows.length} unfinished answers as interrupted`);
  }

  async start(userId: string, threadId: string, content: string): Promise<AiSendMessageResponse> {
    const turn = await this.agent.prepareTurn(userId, threadId, content);
    if (this.runs.get(threadId)?.finished === false) {
      throw new AiError(
        'AI_RUN_IN_PROGRESS',
        'The assistant is still answering in this chat',
        HttpStatus.CONFLICT,
      );
    }
    const run: Run = {
      userId,
      threadId,
      messageId: '',
      frames: [],
      subscribers: new Set(),
      abort: new AbortController(),
      finished: false,
    };
    this.runs.set(threadId, run);
    try {
      const history = await this.threads.historyRows(threadId);
      const userMessage = await this.threads.addMessage(turn.thread, 'user', content);
      const reply = await this.threads.addMessage(turn.thread, 'assistant', '', 'running');
      run.messageId = reply.id;
      void this.execute(run, turn, history);
      return { messageId: reply.id, userMessageId: userMessage.id };
    } catch (err) {
      this.runs.delete(threadId);
      throw err;
    }
  }

  attach(threadId: string, after: number, listener: Subscriber): (() => void) | null {
    const run = this.runs.get(threadId);
    if (!run) return null;
    const missed = run.frames.filter((frame) => frame.seq > after);
    if (run.finished && missed.length === 0) return null;
    for (const frame of missed) listener(frame);
    if (run.finished) return () => undefined;
    run.subscribers.add(listener);
    return () => run.subscribers.delete(listener);
  }

  stop(threadId: string): boolean {
    const run = this.runs.get(threadId);
    if (!run || run.finished) return false;
    run.abort.abort();
    return true;
  }

  private async execute(run: Run, turn: PreparedTurn, history: MessageRow[]): Promise<void> {
    let text = '';
    let items: Record<string, unknown>[] = [];
    let timer: NodeJS.Timeout | null = null;
    let writes = Promise.resolve();

    const write = (values: MessageUpdate) => {
      writes = writes
        .then(() => this.db.update(aiMessages).set(values).where(eq(aiMessages.id, run.messageId)))
        .then(
          () => undefined,
          (err: Error) =>
            this.logger.warn(`Persisting answer ${run.messageId} failed: ${err.message}`),
        );
      return writes;
    };
    const cancelFlush = () => {
      if (timer) clearTimeout(timer);
      timer = null;
    };
    const flush = () => {
      cancelFlush();
      void write({ content: text, items });
    };
    const emit = (event: AiStreamEvent) => {
      if (event.event === 'delta') {
        text += event.data.text;
        timer ??= setTimeout(flush, FLUSH_MS);
      }
      this.publish(run, event);
    };

    try {
      const result = await this.agent.runTurn(turn, history, {
        emit,
        onItems: (next) => {
          items = [...next];
          flush();
        },
        signal: run.abort.signal,
      });
      cancelFlush();
      await write({ content: result.text, items: result.items, status: 'done' });
      const watched = run.subscribers.size > 0;
      this.publish(run, { event: 'done', data: { messageId: run.messageId, status: 'done' } });
      if (!watched) this.notify(run, result.text);
    } catch (err) {
      cancelFlush();
      if (run.abort.signal.aborted) {
        await write({ content: text, items, status: 'stopped' });
        this.publish(run, { event: 'done', data: { messageId: run.messageId, status: 'stopped' } });
      } else {
        const error: AiRunError =
          err instanceof AiError
            ? { code: err.code, message: err.message }
            : { code: 'AI_INTERNAL_ERROR', message: 'Unexpected assistant error' };
        await write({ content: text, items, status: 'error', error });
        this.publish(run, { event: 'error', data: { ...error, messageId: run.messageId } });
      }
    } finally {
      run.finished = true;
      run.subscribers.clear();
      setTimeout(() => {
        if (this.runs.get(run.threadId) === run) this.runs.delete(run.threadId);
      }, GRACE_MS).unref();
    }
  }

  private publish(run: Run, event: AiStreamEvent): void {
    const frame = { ...event, seq: ++this.seq } as AiStreamFrame;
    run.frames.push(frame);
    for (const subscriber of run.subscribers) subscriber(frame);
  }

  private notify(run: Run, text: string): void {
    this.notifications
      .notifyAssistantReply({
        userId: run.userId,
        threadId: run.threadId,
        messageId: run.messageId,
        text,
      })
      .catch((err: Error) => this.logger.warn(`Assistant reply push failed: ${err.message}`));
  }
}
