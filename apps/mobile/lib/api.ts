import { router } from 'expo-router';
import { authClient } from '~/lib/auth-client';
import { API_URL } from '~/lib/env';

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public body?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

type Query = Record<string, string | number | boolean | undefined | null>;

interface RequestInitExtra extends Omit<RequestInit, 'body'> {
  query?: Query;
  body?: unknown;
}

export function buildUrl(path: string, query?: Query): string {
  const base = API_URL.endsWith('/') ? API_URL : `${API_URL}/`;
  const url = new URL(path.replace(/^\/+/, ''), base);
  if (query) {
    for (const [k, v] of Object.entries(query)) {
      if (v === undefined || v === null) continue;
      url.searchParams.set(k, String(v));
    }
  }
  return url.toString();
}

function safeParse(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

export function isUnauthorized(e: unknown): boolean {
  return e instanceof ApiError && e.status === 401;
}

export function errorMessage(e: unknown, fallback: string): string {
  return e instanceof ApiError && e.message ? e.message : fallback;
}

let signingOut = false;

async function handleUnauthorized() {
  if (signingOut) return;
  signingOut = true;
  try {
    await authClient.signOut().catch(() => undefined);
    router.replace('/(auth)/login');
  } finally {
    signingOut = false;
  }
}

export function authHeaders(): Record<string, string> {
  // Native has no cookie jar: the Better Auth Expo client persists the session
  // cookie in SecureStore and exposes it here. Attach it to every API call.
  const cookie = authClient.getCookie();
  return cookie ? { cookie } : {};
}

export function toApiError(res: { status: number; statusText: string }, path: string, text: string) {
  const data = text ? safeParse(text) : undefined;
  if (res.status === 401 && authClient.getCookie() && !path.includes('auth/')) {
    void handleUnauthorized();
  }
  const msg =
    (data && typeof data === 'object' && 'message' in data
      ? String((data as { message: unknown }).message)
      : res.statusText) || 'Request failed';
  return new ApiError(res.status, msg, data);
}

async function request<T>(path: string, init: RequestInitExtra = {}): Promise<T> {
  const { query, body, headers, ...rest } = init;
  const url = buildUrl(path, query);

  const res = await fetch(url, {
    ...rest,
    headers: {
      'content-type': 'application/json',
      accept: 'application/json',
      ...authHeaders(),
      ...(headers as Record<string, string> | undefined),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  const text = await res.text();
  if (!res.ok) throw toApiError(res, path, text);
  return (text ? safeParse(text) : undefined) as T;
}

export const api = {
  get: <T>(path: string, init?: RequestInitExtra) =>
    request<T>(path, { ...init, method: 'GET' }),
  post: <T>(path: string, body?: unknown, init?: RequestInitExtra) =>
    request<T>(path, { ...init, method: 'POST', body }),
  patch: <T>(path: string, body?: unknown, init?: RequestInitExtra) =>
    request<T>(path, { ...init, method: 'PATCH', body }),
  delete: <T>(path: string, init?: RequestInitExtra) =>
    request<T>(path, { ...init, method: 'DELETE' }),
};
