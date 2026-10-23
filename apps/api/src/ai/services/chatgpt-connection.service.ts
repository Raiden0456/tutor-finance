import { BadRequestException, HttpStatus, Inject, Injectable, Logger } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { env } from '../../config.js';
import { DB } from '../../db/db.module.js';
import type { Database } from '../../db/client.js';
import { aiConnections } from '../../db/schema.js';
import {
  CHATGPT_PLAN_SCOPE,
  ChatgptOAuthClient,
  DYNAMIC_CLIENT_ID,
  OAuthError,
  type TokenResponse,
} from '../providers/chatgpt-oauth.client.js';
import { AiError } from '../utils/ai-error.js';
import { decryptSecret, encryptSecret, pkceChallenge, randomToken } from '../utils/crypto.js';

type Row = typeof aiConnections.$inferSelect;

const PENDING_TTL_MS = 10 * 60_000;
const REFRESH_MARGIN_MS = 2 * 60_000;
const HOST_ID_PATTERN =
  /^(urn:uuid:[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}|urn:ietf:params:oauth:jwk-thumbprint:\S+|did:key:\S+)$/;

interface PendingAuthorization {
  userId: string;
  clientId: string | null;
  codeVerifier: string;
  nonce: string;
  redirectUri: string;
  returnTo: string;
  expiresAt: number;
}

export interface CallbackParams {
  code?: string;
  state?: string;
  error?: string;
  client_id?: string;
  scope?: string;
}

export type CallbackResult =
  | { ok: true; userId: string; returnTo: string }
  | { ok: false; userId?: string; returnTo?: string; reason: string };

function hasPlanScope(scopes: string[]): boolean {
  return scopes.includes(CHATGPT_PLAN_SCOPE);
}

function parseScopes(raw: string | undefined): string[] {
  return (raw ?? '').split(/[\s+]+/).filter(Boolean);
}

@Injectable()
export class ChatgptConnectionService {
  private readonly logger = new Logger(ChatgptConnectionService.name);
  private readonly pending = new Map<string, PendingAuthorization>();
  private readonly refreshes = new Map<string, Promise<string>>();

  constructor(
    @Inject(DB) private readonly db: Database,
    private readonly oauth: ChatgptOAuthClient,
  ) {}

  get available(): boolean {
    return (
      env.ai.chatgpt.enabled &&
      HOST_ID_PATTERN.test(env.ai.chatgpt.hostId) &&
      !!env.ai.tokenEncryptionKey
    );
  }

  async findRow(userId: string): Promise<Row | undefined> {
    const [row] = await this.db
      .select()
      .from(aiConnections)
      .where(eq(aiConnections.userId, userId))
      .limit(1);
    return row;
  }

  isConnected(row: Row | undefined): boolean {
    return !!row?.accessTokenEnc && !!row.refreshTokenEnc && hasPlanScope(row.scopes);
  }

  async startConnect(userId: string, returnTo: string | undefined) {
    if (!this.available) {
      throw new AiError(
        'AI_NOT_CONFIGURED',
        'ChatGPT connection requires CHATGPT_HOST_ID and AI_TOKEN_ENCRYPTION_KEY',
        HttpStatus.CONFLICT,
      );
    }
    const target = this.resolveReturnTo(returnTo);
    const row = await this.findRow(userId);
    const state = randomToken();
    const nonce = randomToken();
    const codeVerifier = randomToken(48);
    const redirectUri = env.ai.chatgpt.redirectUri;

    this.prunePending();
    this.pending.set(state, {
      userId,
      clientId: row?.clientId ?? null,
      codeVerifier,
      nonce,
      redirectUri,
      returnTo: target,
      expiresAt: Date.now() + PENDING_TTL_MS,
    });

    const url = this.oauth.buildAuthorizeUrl({
      clientId: row?.clientId ?? DYNAMIC_CLIENT_ID,
      hostId: env.ai.chatgpt.hostId,
      agentName: env.ai.chatgpt.agentName,
      redirectUri,
      state,
      nonce,
      codeChallenge: pkceChallenge(codeVerifier),
      loginHint: row?.accountEmail,
      idTokenHint: row?.idTokenEnc ? decryptSecret(row.idTokenEnc) : null,
      forceConsent: !!row && !hasPlanScope(row.scopes),
    });
    return { url, redirectUri };
  }

  async completeCallback(params: CallbackParams, expectedUserId?: string): Promise<CallbackResult> {
    const pending = params.state ? this.pending.get(params.state) : undefined;
    if (!pending || pending.expiresAt < Date.now()) {
      return { ok: false, reason: 'invalid_state' };
    }
    if (expectedUserId && pending.userId !== expectedUserId) {
      return { ok: false, reason: 'invalid_state' };
    }
    this.pending.delete(params.state!);
    const fail = (reason: string): CallbackResult => ({
      ok: false,
      userId: pending.userId,
      returnTo: pending.returnTo,
      reason,
    });

    if (params.error) return fail(params.error);
    if (!params.code) return fail('missing_code');

    let clientId = pending.clientId;
    if (clientId === null) {
      if (!params.client_id || params.client_id === DYNAMIC_CLIENT_ID) {
        return fail('registration_incomplete');
      }
      clientId = params.client_id;
    } else if (params.client_id && params.client_id !== clientId) {
      return fail('client_mismatch');
    }

    let tokens: TokenResponse;
    try {
      tokens = await this.oauth.exchangeCode({
        clientId,
        code: params.code,
        codeVerifier: pending.codeVerifier,
        redirectUri: pending.redirectUri,
      });
    } catch (err) {
      this.logger.warn(`ChatGPT code exchange failed: ${(err as Error).message}`);
      return fail(err instanceof OAuthError ? err.code : 'exchange_failed');
    }
    if (!tokens.id_token) return fail('missing_id_token');

    let claims;
    try {
      claims = await this.oauth.verifyIdToken(tokens.id_token, clientId, pending.nonce);
    } catch (err) {
      this.logger.warn(`ChatGPT ID token rejected: ${(err as Error).message}`);
      return fail('invalid_id_token');
    }

    const existing = await this.findRow(pending.userId);
    if (existing && existing.clientId === clientId && existing.subject !== claims.sub) {
      return fail('account_mismatch');
    }

    const scopes = parseScopes(tokens.scope ?? params.scope);
    const planEnabled = hasPlanScope(scopes) && !!tokens.refresh_token;
    const values = {
      userId: pending.userId,
      provider: 'chatgpt',
      clientId,
      subject: claims.sub,
      accountEmail: claims.email ?? null,
      hostId: env.ai.chatgpt.hostId,
      idTokenEnc: encryptSecret(tokens.id_token),
      accessTokenEnc: planEnabled ? encryptSecret(tokens.access_token) : null,
      refreshTokenEnc: planEnabled ? encryptSecret(tokens.refresh_token!) : null,
      scopes,
      expiresAt: planEnabled ? new Date(Date.now() + tokens.expires_in * 1000) : null,
    };
    await this.db
      .insert(aiConnections)
      .values(values)
      .onConflictDoUpdate({ target: aiConnections.userId, set: values });

    if (!planEnabled) return fail('chatgpt_plan_not_enabled');
    return { ok: true, userId: pending.userId, returnTo: pending.returnTo };
  }

  async disconnect(userId: string, forget: boolean): Promise<{ revoked: boolean }> {
    const row = await this.findRow(userId);
    if (!row) return { revoked: true };
    const revoked = row.refreshTokenEnc
      ? await this.oauth.revoke(row.clientId, decryptSecret(row.refreshTokenEnc))
      : true;
    if (forget) {
      await this.db.delete(aiConnections).where(eq(aiConnections.userId, userId));
    } else {
      await this.clearTokens(userId);
    }
    return { revoked };
  }

  async getAccessToken(userId: string): Promise<string> {
    const row = await this.findRow(userId);
    if (!row || !this.isConnected(row)) {
      throw new AiError('AI_RECONNECT_REQUIRED', 'ChatGPT is not connected', HttpStatus.CONFLICT);
    }
    if (row.expiresAt && row.expiresAt.getTime() - REFRESH_MARGIN_MS > Date.now()) {
      return decryptSecret(row.accessTokenEnc!);
    }

    let inflight = this.refreshes.get(userId);
    if (!inflight) {
      inflight = this.refresh(row).finally(() => this.refreshes.delete(userId));
      this.refreshes.set(userId, inflight);
    }
    return inflight;
  }

  private async refresh(row: Row): Promise<string> {
    let tokens: TokenResponse;
    try {
      tokens = await this.oauth.refresh(row.clientId, decryptSecret(row.refreshTokenEnc!));
    } catch (err) {
      if (
        err instanceof OAuthError &&
        (err.refreshTokenUnusable || err.code === 'invalid_client')
      ) {
        await this.clearTokens(row.userId);
        throw new AiError(
          'AI_RECONNECT_REQUIRED',
          'ChatGPT session expired, reconnect required',
          HttpStatus.CONFLICT,
        );
      }
      throw new AiError(
        'AI_PROVIDER_ERROR',
        `ChatGPT token refresh failed: ${(err as Error).message}`,
      );
    }

    const scopes = tokens.scope ? parseScopes(tokens.scope) : row.scopes;
    await this.db
      .update(aiConnections)
      .set({
        accessTokenEnc: encryptSecret(tokens.access_token),
        refreshTokenEnc: tokens.refresh_token
          ? encryptSecret(tokens.refresh_token)
          : row.refreshTokenEnc,
        idTokenEnc: tokens.id_token ? encryptSecret(tokens.id_token) : row.idTokenEnc,
        scopes,
        expiresAt: new Date(Date.now() + tokens.expires_in * 1000),
      })
      .where(eq(aiConnections.userId, row.userId));
    return tokens.access_token;
  }

  private async clearTokens(userId: string): Promise<void> {
    await this.db
      .update(aiConnections)
      .set({ accessTokenEnc: null, refreshTokenEnc: null, idTokenEnc: null, expiresAt: null })
      .where(eq(aiConnections.userId, userId));
  }

  private resolveReturnTo(returnTo: string | undefined): string {
    const fallback = new URL('/settings', env.publicAppUrl).toString();
    if (!returnTo) return fallback;
    if (env.mobileSchemes.some((scheme) => returnTo.startsWith(scheme))) return returnTo;

    let parsed: URL;
    try {
      parsed = new URL(returnTo);
    } catch {
      throw new BadRequestException('Invalid returnTo');
    }
    const allowed = [env.publicAppUrl, ...env.trustedOrigins].flatMap((o) => {
      try {
        return [new URL(o).origin];
      } catch {
        return [];
      }
    });
    if (!allowed.includes(parsed.origin))
      throw new BadRequestException('returnTo origin not allowed');
    return parsed.toString();
  }

  private prunePending(): void {
    const now = Date.now();
    for (const [state, p] of this.pending) {
      if (p.expiresAt < now) this.pending.delete(state);
    }
  }
}
