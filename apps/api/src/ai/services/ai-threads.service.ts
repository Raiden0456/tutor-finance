import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { and, asc, desc, eq, inArray, sql } from 'drizzle-orm';
import type { AiMessage, AiMessageStatus, AiPendingAction, AiThread } from '@tutor-finance/shared';
import { DB } from '../../db/db.module.js';
import type { Database } from '../../db/client.js';
import { aiMessages, aiPendingActions, aiThreads, students } from '../../db/schema.js';
import type { CreateThreadDto } from '../dto/ai.dto.js';

export type ThreadRow = typeof aiThreads.$inferSelect;
export type MessageRow = typeof aiMessages.$inferSelect;
export type ActionRow = typeof aiPendingActions.$inferSelect;

export function toThread(r: ThreadRow, running = false): AiThread {
  return {
    id: r.id,
    studentId: r.studentId,
    title: r.title,
    running,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
  };
}

export function toAction(r: ActionRow): AiPendingAction {
  return {
    id: r.id,
    threadId: r.threadId,
    tool: r.tool,
    summary: r.summary,
    args: r.args,
    status: r.status as AiPendingAction['status'],
    result: r.result ?? null,
    createdAt: r.createdAt.toISOString(),
  };
}

export function actionIdsOf(items: MessageRow['items']): string[] {
  return (items ?? [])
    .map((item) => item.pendingActionId)
    .filter((id): id is string => typeof id === 'string');
}

@Injectable()
export class AiThreadsService {
  constructor(@Inject(DB) private readonly db: Database) {}

  async list(userId: string, studentId?: string): Promise<AiThread[]> {
    const conds = [eq(aiThreads.userId, userId)];
    if (studentId) conds.push(eq(aiThreads.studentId, studentId));
    const rows = await this.db
      .select({
        thread: aiThreads,
        running: sql<boolean>`exists (select 1 from ai_messages m where m.thread_id = ${aiThreads}.id and m.status = 'running')`,
      })
      .from(aiThreads)
      .where(and(...conds))
      .orderBy(desc(aiThreads.updatedAt))
      .limit(100);
    return rows.map((r) => toThread(r.thread, r.running));
  }

  async create(userId: string, input: CreateThreadDto): Promise<AiThread> {
    if (input.studentId) {
      const [student] = await this.db
        .select({ id: students.id })
        .from(students)
        .where(and(eq(students.id, input.studentId), eq(students.userId, userId)))
        .limit(1);
      if (!student) throw new NotFoundException('Student not found');
    }
    const [row] = await this.db
      .insert(aiThreads)
      .values({ userId, studentId: input.studentId ?? null, title: input.title?.trim() || null })
      .returning();
    return toThread(row!);
  }

  async findOwned(userId: string, id: string): Promise<ThreadRow> {
    const [row] = await this.db
      .select()
      .from(aiThreads)
      .where(and(eq(aiThreads.id, id), eq(aiThreads.userId, userId)))
      .limit(1);
    if (!row) throw new NotFoundException('Thread not found');
    return row;
  }

  async remove(userId: string, id: string): Promise<void> {
    await this.findOwned(userId, id);
    await this.db.delete(aiThreads).where(and(eq(aiThreads.id, id), eq(aiThreads.userId, userId)));
  }

  historyRows(threadId: string): Promise<MessageRow[]> {
    return this.db
      .select()
      .from(aiMessages)
      .where(eq(aiMessages.threadId, threadId))
      .orderBy(asc(aiMessages.createdAt));
  }

  async actionsByIds(userId: string, ids: string[]): Promise<Map<string, ActionRow>> {
    if (ids.length === 0) return new Map();
    const rows = await this.db
      .select()
      .from(aiPendingActions)
      .where(and(eq(aiPendingActions.userId, userId), inArray(aiPendingActions.id, ids)));
    return new Map(rows.map((r) => [r.id, r]));
  }

  async messages(userId: string, threadId: string): Promise<AiMessage[]> {
    await this.findOwned(userId, threadId);
    const rows = await this.historyRows(threadId);
    const actions = await this.actionsByIds(
      userId,
      rows.flatMap((r) => actionIdsOf(r.items)),
    );
    return rows.map((r) => ({
      id: r.id,
      threadId: r.threadId,
      role: r.role as AiMessage['role'],
      content: r.content,
      status: r.status as AiMessageStatus,
      error: r.error ?? null,
      actions: actionIdsOf(r.items)
        .map((id) => actions.get(id))
        .filter((a): a is ActionRow => !!a)
        .map(toAction),
      createdAt: r.createdAt.toISOString(),
    }));
  }

  async addMessage(
    thread: ThreadRow,
    role: 'user' | 'assistant',
    content: string,
    status: AiMessageStatus = 'done',
  ): Promise<MessageRow> {
    const [row] = await this.db
      .insert(aiMessages)
      .values({ threadId: thread.id, role, content, status })
      .returning();
    const setTitle = role === 'user' && !thread.title;
    await this.db
      .update(aiThreads)
      .set(setTitle ? { title: content.slice(0, 80) } : { updatedAt: new Date() })
      .where(eq(aiThreads.id, thread.id));
    return row!;
  }
}
