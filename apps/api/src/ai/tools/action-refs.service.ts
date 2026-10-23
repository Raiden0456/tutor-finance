import { BadRequestException, ConflictException, Inject, Injectable } from '@nestjs/common';
import { and, desc, eq, inArray, sql } from 'drizzle-orm';
import { DB } from '../../db/db.module.js';
import type { Database } from '../../db/client.js';
import { aiPendingActions } from '../../db/schema.js';
import type { ToolContext } from './tool-format.js';

export type ParentTool = 'create_student' | 'create_lesson';
type ActionRow = typeof aiPendingActions.$inferSelect;

const RESULT_KEYS: Record<ParentTool, string> = {
  create_student: 'studentId',
  create_lesson: 'lessonId',
};
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export interface ResolvedArgs {
  args: Record<string, unknown>;
  resolved: Record<string, string>;
}

function resultId(row: ActionRow): string | null {
  const value = (row.result as Record<string, unknown> | null)?.[
    RESULT_KEYS[row.tool as ParentTool]
  ];
  return row.status === 'confirmed' && typeof value === 'string' ? value : null;
}

@Injectable()
export class ActionRefsService {
  constructor(@Inject(DB) private readonly db: Database) {}

  async find(
    ctx: ToolContext,
    tool: ParentTool,
    ref: string,
  ): Promise<{ row: ActionRow; id: string | null }> {
    if (!ctx.threadId) throw new BadRequestException('References need a conversation');
    const byId = UUID.test(ref);
    if (!byId && tool !== 'create_student') {
      throw new BadRequestException(`"${ref}" is not a pendingActionId`);
    }
    const [row] = await this.db
      .select()
      .from(aiPendingActions)
      .where(
        and(
          eq(aiPendingActions.userId, ctx.userId),
          eq(aiPendingActions.threadId, ctx.threadId),
          eq(aiPendingActions.tool, tool),
          inArray(aiPendingActions.status, ['pending', 'confirmed']),
          byId
            ? eq(aiPendingActions.id, ref)
            : sql`lower(${aiPendingActions.args}->'dto'->>'name') = lower(${ref.trim()})`,
        ),
      )
      .orderBy(desc(aiPendingActions.createdAt))
      .limit(1);
    if (!row) throw new BadRequestException(`No ${tool} proposal "${ref}" in this conversation`);
    return { row, id: resultId(row) };
  }

  async resolve(userId: string, args: Record<string, unknown>): Promise<ResolvedArgs> {
    const refs = Array.isArray(args.refs) ? (args.refs as string[]) : [];
    if (refs.length === 0) return { args, resolved: {} };
    const rows = await this.db
      .select()
      .from(aiPendingActions)
      .where(and(eq(aiPendingActions.userId, userId), inArray(aiPendingActions.id, refs)));

    let json = JSON.stringify(args);
    const resolved: Record<string, string> = {};
    for (const ref of refs) {
      const row = rows.find((r) => r.id === ref);
      const id = row ? resultId(row) : null;
      if (!id) {
        const pending = row?.status === 'pending';
        throw new ConflictException({
          code: pending ? 'AI_ACTION_DEPENDENCY_PENDING' : 'AI_ACTION_DEPENDENCY_FAILED',
          message: pending
            ? 'Confirm the earlier step first'
            : 'The earlier step it depends on was not applied',
        });
      }
      resolved[ref] = id;
      json = json.replaceAll(`"${ref}"`, `"${id}"`);
    }
    const { refs: _refs, ...rest } = JSON.parse(json) as Record<string, unknown>;
    return { args: rest, resolved };
  }
}
