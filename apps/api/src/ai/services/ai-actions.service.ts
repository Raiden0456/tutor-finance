import {
  ConflictException,
  HttpException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { and, asc, eq, inArray } from 'drizzle-orm';
import type { AiPendingAction } from '@tutor-finance/shared';
import { DB } from '../../db/db.module.js';
import type { Database } from '../../db/client.js';
import { aiPendingActions } from '../../db/schema.js';
import { ActionRefsService } from '../tools/action-refs.service.js';
import { isWriteTool, type WriteToolName } from '../tools/tool-definitions.js';
import { WriteToolsService, type Proposal } from '../tools/write-tools.service.js';
import { toAction, type ActionRow } from './ai-threads.service.js';

@Injectable()
export class AiActionsService {
  private readonly logger = new Logger(AiActionsService.name);

  constructor(
    @Inject(DB) private readonly db: Database,
    private readonly writeTools: WriteToolsService,
    private readonly refs: ActionRefsService,
  ) {}

  async create(
    userId: string,
    threadId: string,
    tool: WriteToolName,
    proposal: Proposal,
  ): Promise<ActionRow> {
    const [row] = await this.db
      .insert(aiPendingActions)
      .values({ userId, threadId, tool, args: proposal.args, summary: proposal.summary })
      .returning();
    return row!;
  }

  async confirm(userId: string, id: string): Promise<AiPendingAction> {
    const row = await this.owned(userId, id);
    if (row.status !== 'pending') throw new ConflictException(`Action is already ${row.status}`);
    const { args, resolved } = await this.refs.resolve(userId, row.args);
    const claimed = await this.claim(userId, id, 'confirmed');
    if (!isWriteTool(claimed.tool)) throw new ConflictException('Unknown tool');

    let status: 'confirmed' | 'failed' = 'confirmed';
    let result: unknown;
    try {
      result = await this.writeTools.execute(claimed.tool, args, userId);
      if (Object.keys(resolved).length > 0) result = { ...(result as object), resolved };
    } catch (err) {
      status = 'failed';
      if (!(err instanceof HttpException))
        this.logger.error(`AI action ${id} failed`, err as Error);
      result = { error: err instanceof HttpException ? err.message : 'Internal error' };
    }

    const [updated] = await this.db
      .update(aiPendingActions)
      .set({ status, result, args })
      .where(eq(aiPendingActions.id, id))
      .returning();
    return toAction(updated!);
  }

  async confirmAll(userId: string, ids: string[]): Promise<AiPendingAction[]> {
    const rows = await this.db
      .select()
      .from(aiPendingActions)
      .where(and(eq(aiPendingActions.userId, userId), inArray(aiPendingActions.id, ids)))
      .orderBy(asc(aiPendingActions.createdAt));
    const out = rows.map(toAction);
    for (const [i, row] of rows.entries()) {
      if (row.status !== 'pending') continue;
      try {
        out[i] = await this.confirm(userId, row.id);
      } catch (err) {
        if (!(err instanceof HttpException)) throw err;
        break;
      }
      if (out[i]!.status === 'failed') break;
    }
    return out;
  }

  async reject(userId: string, id: string): Promise<AiPendingAction> {
    return toAction(await this.claim(userId, id, 'rejected'));
  }

  private async claim(userId: string, id: string, status: 'confirmed' | 'rejected') {
    const [row] = await this.db
      .update(aiPendingActions)
      .set({ status })
      .where(
        and(
          eq(aiPendingActions.id, id),
          eq(aiPendingActions.userId, userId),
          eq(aiPendingActions.status, 'pending'),
        ),
      )
      .returning();
    if (row) return row;
    const existing = await this.owned(userId, id);
    throw new ConflictException(`Action is already ${existing.status}`);
  }

  private async owned(userId: string, id: string): Promise<ActionRow> {
    const [row] = await this.db
      .select()
      .from(aiPendingActions)
      .where(and(eq(aiPendingActions.id, id), eq(aiPendingActions.userId, userId)))
      .limit(1);
    if (!row) throw new NotFoundException('Action not found');
    return row;
  }
}
