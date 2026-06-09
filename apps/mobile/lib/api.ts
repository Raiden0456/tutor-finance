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

function buildUrl(path: string, query?: Query): string {
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

async function request<T>(path: string, init: RequestInitExtra = {}): Promise<T> {
  const { query, body, headers, ...rest } = init;
  const url = buildUrl(path, query);

  // Native has no cookie jar: the Better Auth Expo client persists the session
  // cookie in SecureStore and exposes it here. Attach it to every API call.
  const cookie = authClient.getCookie();

  const res = await fetch(url, {
    ...rest,
    headers: {
      'content-type': 'application/json',
      accept: 'application/json',
      ...(cookie ? { cookie } : {}),
      ...(headers as Record<string, string> | undefined),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  const text = await res.text();
  const data = text ? safeParse(text) : undefined;

  if (!res.ok) {
    const msg =
      (data && typeof data === 'object' && 'message' in data
        ? String((data as { message: unknown }).message)
        : res.statusText) || 'Request failed';
    throw new ApiError(res.status, msg, data);
  }
  return data as T;
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
