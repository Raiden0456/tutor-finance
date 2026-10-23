import { createPublicKey, verify, type JsonWebKey } from 'node:crypto';
import { Injectable } from '@nestjs/common';

const AUTH_ISSUER = 'https://auth.openai.com';
const AUTHORIZE_URL = `${AUTH_ISSUER}/api/accounts/authorize`;
const TOKEN_URL = `${AUTH_ISSUER}/api/accounts/oauth/token`;
const DISCOVERY_URL = `${AUTH_ISSUER}/.well-known/openid-configuration`;
export const OPENAI_RESOURCE = 'https://api.openai.com/v1';
export const DYNAMIC_CLIENT_ID = 'dynamic_agent_client';
export const CHATGPT_PLAN_SCOPE = 'chatgpt.tokens.use.direct';
export const CHATGPT_SCOPES = `openid profile email offline_access resource.invoke ${CHATGPT_PLAN_SCOPE}`;
const UNUSABLE_REFRESH_CODES = new Set([
  'invalid_grant',
  'invalid_refresh_token',
  'token_expired',
  'refresh_token_expired',
  'refresh_token_invalidated',
  'refresh_token_reused',
]);

export interface TokenResponse {
  access_token: string;
  refresh_token?: string;
  id_token?: string;
  token_type: string;
  expires_in: number;
  scope?: string;
}

export interface IdTokenClaims {
  sub: string;
  email?: string;
}

export class OAuthError extends Error {
  constructor(
    readonly code: string,
    readonly status: number,
    message: string,
  ) {
    super(message);
  }

  get refreshTokenUnusable(): boolean {
    return UNUSABLE_REFRESH_CODES.has(this.code);
  }
}

interface Discovery {
  issuer: string;
  jwks_uri: string;
  revocation_endpoint?: string;
}

interface Jwk extends JsonWebKey {
  kid?: string;
  alg?: string;
}

export interface AuthorizeParams {
  clientId: string;
  hostId: string;
  agentName?: string;
  redirectUri: string;
  state: string;
  nonce: string;
  codeChallenge: string;
  loginHint?: string | null;
  idTokenHint?: string | null;
  forceConsent?: boolean;
}

function decodeSegment<T>(segment: string): T {
  return JSON.parse(Buffer.from(segment, 'base64url').toString('utf8')) as T;
}

@Injectable()
export class ChatgptOAuthClient {
  private discovery: Promise<Discovery> | undefined;
  private jwks: { keys: Jwk[]; fetchedAt: number } | undefined;

  buildAuthorizeUrl(p: AuthorizeParams): string {
    const params: [string, string | null | undefined | false][] = [
      ['client_id', p.clientId],
      ['agent_name_hint', p.clientId === DYNAMIC_CLIENT_ID && p.agentName],
      ['ext_agent_host_id', p.hostId],
      ['id_token_hint', p.idTokenHint],
      ['login_hint', p.loginHint],
      ['response_type', 'code'],
      ['redirect_uri', p.redirectUri],
      ['scope', CHATGPT_SCOPES],
      ['resource', OPENAI_RESOURCE],
      ['state', p.state],
      ['nonce', p.nonce],
      ['code_challenge_method', 'S256'],
      ['code_challenge', p.codeChallenge],
      ['prompt', p.forceConsent && 'consent'],
    ];
    const query = params
      .filter((entry): entry is [string, string] => !!entry[1])
      .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
      .join('&');
    return `${AUTHORIZE_URL}?${query}`;
  }

  exchangeCode(input: {
    clientId: string;
    code: string;
    codeVerifier: string;
    redirectUri: string;
  }): Promise<TokenResponse> {
    return this.tokenRequest({
      grant_type: 'authorization_code',
      client_id: input.clientId,
      code: input.code,
      code_verifier: input.codeVerifier,
      redirect_uri: input.redirectUri,
      resource: OPENAI_RESOURCE,
    });
  }

  refresh(clientId: string, refreshToken: string): Promise<TokenResponse> {
    return this.tokenRequest({
      grant_type: 'refresh_token',
      client_id: clientId,
      refresh_token: refreshToken,
      resource: OPENAI_RESOURCE,
    });
  }

  async revoke(clientId: string, refreshToken: string): Promise<boolean> {
    const { revocation_endpoint } = await this.getDiscovery();
    if (!revocation_endpoint) return false;
    try {
      const res = await fetch(revocation_endpoint, {
        method: 'POST',
        headers: { 'content-type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          token: refreshToken,
          token_type_hint: 'refresh_token',
          client_id: clientId,
        }),
      });
      return res.status === 200;
    } catch {
      return false;
    }
  }

  async verifyIdToken(idToken: string, clientId: string, nonce?: string): Promise<IdTokenClaims> {
    const [rawHeader, rawPayload, rawSignature] = idToken.split('.');
    if (!rawHeader || !rawPayload || !rawSignature) throw new Error('Malformed ID token');

    const header = decodeSegment<{ alg: string; kid?: string }>(rawHeader);
    const claims = decodeSegment<{
      iss: string;
      aud: string | string[];
      exp: number;
      nonce?: string;
      sub: string;
      email?: string;
    }>(rawPayload);

    if (header.alg !== 'RS256') throw new Error(`Unsupported ID token alg: ${header.alg}`);
    const jwk = await this.findKey(header.kid);
    const valid = verify(
      'RSA-SHA256',
      Buffer.from(`${rawHeader}.${rawPayload}`),
      createPublicKey({ key: jwk, format: 'jwk' }),
      Buffer.from(rawSignature, 'base64url'),
    );
    if (!valid) throw new Error('ID token signature is invalid');

    const { issuer } = await this.getDiscovery();
    const audiences = Array.isArray(claims.aud) ? claims.aud : [claims.aud];
    if (claims.iss !== issuer) throw new Error('ID token issuer mismatch');
    if (!audiences.includes(clientId)) throw new Error('ID token audience mismatch');
    if (claims.exp * 1000 < Date.now()) throw new Error('ID token expired');
    if (nonce !== undefined && claims.nonce !== nonce) throw new Error('ID token nonce mismatch');
    if (!claims.sub) throw new Error('ID token has no subject');

    return { sub: claims.sub, email: claims.email };
  }

  private async tokenRequest(body: Record<string, string>): Promise<TokenResponse> {
    const res = await fetch(TOKEN_URL, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded', accept: 'application/json' },
      body: new URLSearchParams(body),
    });
    const text = await res.text();
    let json: Record<string, unknown> = {};
    try {
      json = JSON.parse(text) as Record<string, unknown>;
    } catch {
      json = {};
    }
    if (!res.ok) {
      const errorField = json.error;
      const code =
        typeof errorField === 'string'
          ? errorField
          : typeof (errorField as { code?: unknown })?.code === 'string'
            ? (errorField as { code: string }).code
            : `http_${res.status}`;
      const description =
        typeof json.error_description === 'string' ? json.error_description : text.slice(0, 300);
      throw new OAuthError(code, res.status, description);
    }
    if (typeof json.access_token !== 'string') {
      throw new OAuthError(
        'invalid_token_response',
        res.status,
        'Token response has no access_token',
      );
    }
    return json as unknown as TokenResponse;
  }

  private getDiscovery(): Promise<Discovery> {
    this.discovery ??= fetch(DISCOVERY_URL)
      .then((res) => {
        if (!res.ok) throw new Error(`OpenID discovery failed: ${res.status}`);
        return res.json() as Promise<Discovery>;
      })
      .catch((err: unknown) => {
        this.discovery = undefined;
        throw err;
      });
    return this.discovery;
  }

  private async findKey(kid: string | undefined): Promise<Jwk> {
    const fresh = this.jwks && Date.now() - this.jwks.fetchedAt < 3_600_000;
    let key = fresh ? this.jwks!.keys.find((k) => k.kid === kid) : undefined;
    if (!key) {
      const { jwks_uri } = await this.getDiscovery();
      const res = await fetch(jwks_uri);
      if (!res.ok) throw new Error(`JWKS fetch failed: ${res.status}`);
      const { keys } = (await res.json()) as { keys: Jwk[] };
      this.jwks = { keys, fetchedAt: Date.now() };
      key = keys.find((k) => k.kid === kid) ?? (kid === undefined ? keys[0] : undefined);
    }
    if (!key) throw new Error('No matching JWKS key for ID token');
    return key;
  }
}
