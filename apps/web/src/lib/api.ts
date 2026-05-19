import { BROWSER_API_URL, SERVER_API_URL } from './env';

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

interface RequestInitExtra extends Omit<RequestInit, 'body'> {
  query?: Record<string, string | number | boolean | undefined | null>;
  body?: unknown;
}

function buildUrl(base: string, path: string, query?: RequestInitExtra['query']): string {
  const baseUrl = new URL(base.endsWith('/') ? base : `${base}/`);
  const url = new URL(path.replace(/^\/+/, ''), baseUrl);
  if (query) {
    for (const [k, v] of Object.entries(query)) {
      if (v === undefined || v === null) continue;
      url.searchParams.set(k, String(v));
    }
  }
  return url.toString();
}

async function request<T>(base: string, path: string, init: RequestInitExtra = {}): Promise<T> {
  const { query, body, headers, ...rest } = init;
  const url = buildUrl(base, path, query);
  const res = await fetch(url, {
    ...rest,
    credentials: 'include',
    headers: {
      'content-type': 'application/json',
      accept: 'application/json',
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

function safeParse(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

// Browser client — same-origin requests go through /api/* proxy so cookies
// stay first-party (Safari ITP friendly).
const BROWSER_PROXY_URL = `${BROWSER_API_URL}/api`;

export const api = {
  get: <T>(path: string, init?: RequestInitExtra) =>
    request<T>(BROWSER_PROXY_URL, path, { ...init, method: 'GET' }),
  post: <T>(path: string, body?: unknown, init?: RequestInitExtra) =>
    request<T>(BROWSER_PROXY_URL, path, { ...init, method: 'POST', body }),
  patch: <T>(path: string, body?: unknown, init?: RequestInitExtra) =>
    request<T>(BROWSER_PROXY_URL, path, { ...init, method: 'PATCH', body }),
  delete: <T>(path: string, init?: RequestInitExtra) =>
    request<T>(BROWSER_PROXY_URL, path, { ...init, method: 'DELETE' }),
};

// Server client — used in Astro frontmatter, forwards cookie header.
export function serverApi(cookie: string | undefined) {
  const headers = cookie ? { cookie } : undefined;
  return {
    get: <T>(path: string, init?: RequestInitExtra) =>
      request<T>(SERVER_API_URL, path, {
        ...init,
        method: 'GET',
        headers: { ...init?.headers, ...headers },
      }),
    post: <T>(path: string, body?: unknown, init?: RequestInitExtra) =>
      request<T>(SERVER_API_URL, path, {
        ...init,
        method: 'POST',
        body,
        headers: { ...init?.headers, ...headers },
      }),
  };
}
