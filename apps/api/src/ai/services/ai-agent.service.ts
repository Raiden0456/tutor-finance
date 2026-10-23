import { HttpException, HttpStatus, Inject, Injectable, Logger } from '@nestjs/common';
import type {
  AiDigestResponse,
  AiLanguage,
  AiProviderKind,
  AiStreamEvent,
} from '@tutor-finance/shared';
import { and, eq } from 'drizzle-orm';
import type { Database } from '../../db/client.js';
import { DB } from '../../db/db.module.js';
import { aiDigests } from '../../db/schema.js';
import { env } from '../../config.js';
import { AiProviderService, type ResolvedProvider } from '../providers/ai-provider.service.js';
import {
  ResponsesApiError,
  ResponsesClient,
  type ResponseItem,
} from '../providers/responses.client.js';
import { ReadToolsService } from '../tools/read-tools.service.js';
import { isReadTool, isWriteTool, toolsFor } from '../tools/tool-definitions.js';
import { localDateKey, when, type ToolContext } from '../tools/tool-format.js';
import { WriteToolsService } from '../tools/write-tools.service.js';
import { AiError } from '../utils/ai-error.js';
import { AiActionsService } from './ai-actions.service.js';
import { AiSettingsService } from './ai-settings.service.js';
import {
  actionIdsOf,
  AiThreadsService,
  type MessageRow,
  type ThreadRow,
} from './ai-threads.service.js';

type Emit = (event: AiStreamEvent) => void;
type InputItem = Record<string, unknown>;

const MAX_ITERATIONS = 12;
const USAGE_URL = 'https://chatgpt.com/settings/usage';

export interface PreparedTurn {
  thread: ThreadRow;
  ctx: ToolContext;
  provider: ResolvedProvider;
  content: string;
}

const LANGUAGE_NAMES: Record<Exclude<AiLanguage, 'auto'>, string> = {
  ru: 'Russian',
  en: 'English',
  uk: 'Ukrainian',
  kk: 'Kazakh',
  tr: 'Turkish',
  pl: 'Polish',
  de: 'German',
  es: 'Spanish',
  fr: 'French',
  it: 'Italian',
};

function preferredLanguage(ctx: ToolContext): string {
  return LANGUAGE_NAMES[ctx.aiLanguage === 'auto' ? ctx.locale : ctx.aiLanguage];
}

function replayable(item: ResponseItem): InputItem {
  if (item.type === 'reasoning') return item;
  const { id: _id, ...rest } = item;
  return rest;
}

@Injectable()
export class AiAgentService {
  private readonly logger = new Logger(AiAgentService.name);

  constructor(
    private readonly threads: AiThreadsService,
    private readonly actions: AiActionsService,
    private readonly settings: AiSettingsService,
    private readonly providers: AiProviderService,
    private readonly responses: ResponsesClient,
    private readonly readTools: ReadToolsService,
    private readonly writeTools: WriteToolsService,
    @Inject(DB) private readonly db: Database,
  ) {}

  async prepareTurn(userId: string, threadId: string, content: string): Promise<PreparedTurn> {
    await this.settings.assertConsent(userId);
    const thread = await this.threads.findOwned(userId, threadId);
    const provider = await this.providers.resolve(userId);
    const ctx = await this.settings.context(userId, thread.id);
    return { thread, ctx, provider, content };
  }

  async runTurn(
    turn: PreparedTurn,
    history: MessageRow[],
    hooks: { emit: Emit; onItems: (items: InputItem[]) => void; signal: AbortSignal },
  ): Promise<{ text: string; items: InputItem[] }> {
    try {
      const input = [
        ...(await this.historyInput(turn.ctx.userId, history)),
        { role: 'user', content: turn.content },
      ];
      const instructions = await this.chatInstructions(turn.ctx, turn.thread.studentId);
      return await this.loop(turn.provider, instructions, input, false, turn.ctx, {
        effort: env.ai.chatEffort,
        ...hooks,
      });
    } catch (err) {
      if (hooks.signal.aborted) throw err;
      throw this.toAiError(err, turn.provider.kind);
    }
  }

  async getDigest(userId: string): Promise<AiDigestResponse | null> {
    await this.settings.assertConsent(userId);
    const ctx = await this.settings.context(userId);
    const [row] = await this.db
      .select({ text: aiDigests.text, generatedAt: aiDigests.generatedAt })
      .from(aiDigests)
      .where(and(eq(aiDigests.userId, userId), eq(aiDigests.localDate, localDateKey(ctx))))
      .limit(1);
    return row ? { text: row.text, generatedAt: row.generatedAt.toISOString() } : null;
  }

  async generateDigest(userId: string): Promise<AiDigestResponse> {
    await this.settings.assertConsent(userId);
    const ctx = await this.settings.context(userId);
    const provider = await this.providers.resolve(userId);
    try {
      const overview = await this.readTools.run('get_today_overview', {}, ctx);
      const input = [
        {
          role: 'user',
          content: `get_today_overview result:\n${JSON.stringify(overview)}\n\nWrite today's digest.`,
        },
      ];
      const { text } = await this.loop(provider, this.digestInstructions(ctx), input, true, ctx, {
        effort: env.ai.digestEffort,
      });
      const generatedAt = new Date();
      const values = { userId, localDate: localDateKey(ctx), text: text.trim(), generatedAt };
      await this.db
        .insert(aiDigests)
        .values(values)
        .onConflictDoUpdate({
          target: [aiDigests.userId, aiDigests.localDate],
          set: { text: values.text, generatedAt },
        });
      return { text: values.text, generatedAt: generatedAt.toISOString() };
    } catch (err) {
      throw this.toAiError(err, provider.kind);
    }
  }

  private async loop(
    provider: ResolvedProvider,
    instructions: string,
    input: InputItem[],
    readOnly: boolean,
    ctx: ToolContext,
    options: {
      effort: string;
      emit?: Emit;
      onItems?: (items: InputItem[]) => void;
      signal?: AbortSignal;
    },
  ): Promise<{ text: string; items: InputItem[] }> {
    const { effort, emit, onItems, signal } = options;
    const tools = toolsFor(readOnly);
    const persisted: InputItem[] = [];
    let text = '';

    for (let i = 0; i < MAX_ITERATIONS; i++) {
      let separated = i === 0 || !text;
      const output = await this.responses.stream(
        provider.token,
        { model: env.ai.model, instructions, input, tools, reasoning: { effort } },
        (delta) => {
          const chunk = separated ? delta : `\n\n${delta}`;
          separated = true;
          text += chunk;
          emit?.({ event: 'delta', data: { text: chunk } });
        },
        signal,
      );

      input.push(...output.map(replayable));
      const calls = output.filter((item) => item.type === 'function_call');
      if (calls.length === 0) return { text, items: persisted };

      for (const call of calls) {
        const { output: result, pendingActionId } = await this.runTool(call, ctx, emit);
        const callItem: InputItem = {
          type: 'function_call',
          call_id: call.call_id,
          name: call.name,
          arguments: call.arguments,
          ...(call.namespace ? { namespace: call.namespace } : {}),
        };
        const outputItem: InputItem = {
          type: 'function_call_output',
          call_id: call.call_id,
          output: result,
        };
        input.push(outputItem);
        persisted.push(callItem, pendingActionId ? { ...outputItem, pendingActionId } : outputItem);
        onItems?.(persisted);
      }
    }
    throw new AiError(
      'AI_LOOP_LIMIT',
      'The assistant needed too many steps; try a narrower question',
    );
  }

  private async runTool(
    call: ResponseItem,
    ctx: ToolContext,
    emit?: Emit,
  ): Promise<{ output: string; pendingActionId?: string }> {
    const name = String(call.name);
    emit?.({ event: 'tool', data: { name, status: 'started' } });
    try {
      const args = JSON.parse(String(call.arguments || '{}')) as Record<string, unknown>;
      if (isReadTool(name)) {
        const result = await this.readTools.run(name, args, ctx);
        emit?.({ event: 'tool', data: { name, status: 'completed' } });
        return { output: JSON.stringify(result) };
      }
      if (isWriteTool(name) && ctx.threadId) {
        const proposal = await this.writeTools.propose(name, args, ctx);
        const action = await this.actions.create(ctx.userId, ctx.threadId, name, proposal);
        emit?.({
          event: 'action',
          data: {
            pendingActionId: action.id,
            tool: name,
            summary: action.summary,
            args: action.args,
          },
        });
        emit?.({ event: 'tool', data: { name, status: 'completed' } });
        return {
          output: JSON.stringify({
            pendingActionId: action.id,
            status: 'awaiting_user_confirmation',
            summary: action.summary,
            ...proposal.details,
          }),
          pendingActionId: action.id,
        };
      }
      throw new HttpException(`Tool not available: ${name}`, HttpStatus.BAD_REQUEST);
    } catch (err) {
      emit?.({ event: 'tool', data: { name, status: 'failed' } });
      if (!(err instanceof HttpException) && !(err instanceof SyntaxError)) {
        this.logger.error(`AI tool ${name} failed`, err as Error);
      }
      const message =
        err instanceof HttpException || err instanceof SyntaxError ? err.message : 'Internal error';
      return { output: JSON.stringify({ error: message }) };
    }
  }

  private async historyInput(userId: string, rows: MessageRow[]): Promise<InputItem[]> {
    const actions = await this.threads.actionsByIds(
      userId,
      rows.flatMap((r) => actionIdsOf(r.items)),
    );
    const input: InputItem[] = [];
    for (const row of rows) {
      if (row.role === 'user') {
        input.push({ role: 'user', content: row.content });
        continue;
      }
      for (const item of row.items ?? []) {
        if (typeof item.pendingActionId !== 'string') {
          input.push(item);
          continue;
        }
        const action = actions.get(item.pendingActionId);
        input.push({
          type: 'function_call_output',
          call_id: item.call_id,
          output: JSON.stringify(
            action
              ? {
                  pendingActionId: action.id,
                  summary: action.summary,
                  status: action.status,
                  result: action.result,
                }
              : { error: 'Action no longer exists' },
          ),
        });
      }
      if (row.content) input.push({ role: 'assistant', content: row.content });
    }
    return input;
  }

  private baseInstructions(ctx: ToolContext): string {
    return [
      'You are the assistant inside Uchetka, a schedule and finance app for a private tutor. You help with daily summaries, schedules and lesson conflicts, payments and debts, finances, notes, homework help and lesson planning.',
      `Now: ${when(ctx, new Date()).local} (${ctx.timeZone}). Primary currency: ${ctx.primaryCurrency}.`,
      'Always use the tutor tools for facts about students, lessons, payments, money, dates and conflicts. Never invent or estimate numbers, dates, names or amounts; if tools do not return something, say so.',
      'Money in tool results has "minor" (integer minor units) and "formatted"; show "formatted". Tool arguments price, amount, hourlyRate and paidAmount are in major units.',
      'Dates in tool results have "iso" and "local" (user time zone); show "local". Dates you pass without an offset are read in the user time zone.',
      'Display statuses: scheduled, awaiting_payment, paid, cancelled.',
    ].join('\n');
  }

  private async chatInstructions(ctx: ToolContext, studentId: string | null): Promise<string> {
    const parts = [
      this.baseInstructions(ctx),
      `Reply in the language of the user's latest message. If that message has no clear language (only names, numbers or a quick-prompt), reply in ${preferredLanguage(ctx)}.`,
      'You can do everything the app can do: students (hourly or package pricing, package payments, closing packages, archive), lessons (create, reschedule, status, payments, archive, delete), recurring lesson schedules (create, change, pause, delete), recurring expenses, transactions, settings and Google Calendar sync. Never tell the user to do something in the app themselves when a write tool can do it; propose it instead. Only account, password, sign-in and connecting or disconnecting Google or ChatGPT are out of reach.',
      'Write tools create proposals the user confirms with a button (one by one or "Confirm all"). Never claim a change is done unless a tool result shows status "confirmed". After proposing, list in one or two short lines what will happen and any assumptions, and ask to confirm.',
      'Propose the whole request in one turn so the user confirms once. When later steps need something not created yet, chain them: call create_student first, then pass the returned pendingActionId as studentRef to create_recurring_schedule, create_lesson, create_transaction, set_package_payment or update_student; likewise pass a create_lesson pendingActionId as lessonRef. Call the dependent tools only after the parent call returned its pendingActionId. A package bought by a new student belongs in create_student (packageLessons, packagePrice, packagePaidAmount = price when paid).',
      'Ask only for information that is truly required and cannot be inferred (e.g. a name). Otherwise use sensible defaults and state them: currency = the one the user named, else the primary currency; lesson duration from the request, else 60 min; frequency weekly; schedule start = the date the user gave, else the next upcoming day among the requested weekdays.',
      'Proposals for lessons and schedules return "conflicts" with existing lessons; mention them briefly. For bigger planning use find_schedule_conflicts with daysOfWeek and startTime first.',
      'Resolve existing students by name with list_students before using ids; ask if the match is ambiguous.',
      "For homework help and lesson planning, first read the student's profile, recent lessons, notes and homework with get_student and build on that history.",
      'Be concise; prefer short lists. Never use markdown tables: the app is read on a phone.',
    ];
    if (studentId) {
      const profile = await this.readTools.getStudent(studentId, ctx);
      parts.push(
        `This conversation is about the student "${profile.name}" (id ${profile.id}). Default every question to this student and pass this studentId to tools. Current profile from get_student:\n${JSON.stringify(profile)}`,
      );
    }
    return parts.join('\n\n');
  }

  private digestInstructions(ctx: ToolContext): string {
    return [
      this.baseInstructions(ctx),
      `Write in ${preferredLanguage(ctx)}.`,
      'Write a short daily digest for the dashboard: today\'s lessons, lessons awaiting payment, schedule conflicts in the next 7 days, then 1-3 concrete actionable suggestions. Plain text, short lines starting with "- ", at most 120 words, no greeting, no markdown headings. Mention only facts from the data.',
    ].join('\n\n');
  }

  private toAiError(err: unknown, kind: AiProviderKind): AiError {
    if (err instanceof AiError) return err;
    if (err instanceof ResponsesApiError) {
      if (err.code === 'subscription_sharing_usage_limit_exceeded') {
        return new AiError(
          'AI_USAGE_LIMIT',
          `ChatGPT usage limit reached. See ${USAGE_URL}`,
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }
      if (
        kind === 'chatgpt' &&
        (err.status === 401 || err.code === 'subscription_sharing_invalid_user')
      ) {
        return new AiError('AI_RECONNECT_REQUIRED', err.message, HttpStatus.CONFLICT);
      }
      this.logger.warn(`Responses API error ${err.status} ${err.code}: ${err.message}`);
      return new AiError('AI_PROVIDER_ERROR', `${err.code}: ${err.message}`);
    }
    if (err instanceof HttpException) {
      return new AiError('AI_INTERNAL_ERROR', err.message, err.getStatus());
    }
    this.logger.error('AI request failed', err as Error);
    return new AiError(
      'AI_INTERNAL_ERROR',
      'Unexpected assistant error',
      HttpStatus.INTERNAL_SERVER_ERROR,
    );
  }
}
