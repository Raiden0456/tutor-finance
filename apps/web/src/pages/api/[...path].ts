import type { APIRoute } from 'astro';
import { SERVER_API_URL } from '@/lib/env';

export const prerender = false;

const STRIPPED_REQUEST_HEADERS = new Set([
  'connection',
  'keep-alive',
  'proxy-authenticate',
  'proxy-authorization',
  'te',
  'trailer',
  'transfer-encoding',
  'upgrade',
  'host',
  'content-length',
  'accept-encoding',
]);

const STRIPPED_RESPONSE_HEADERS = new Set([
  'connection',
  'keep-alive',
  'proxy-authenticate',
  'proxy-authorization',
  'te',
  'trailer',
  'transfer-encoding',
  'upgrade',
  'content-length',
  'content-encoding',
]);

const apiBase = new URL(SERVER_API_URL);
const apiBasePath = apiBase.pathname.replace(/\/+$/, '');

function filterHeaders(src: Headers, stripped: Set<string>): Headers {
  const connectionTokens = (src.get('connection') ?? '')
    .split(',')
    .map((token) => token.trim().toLowerCase())
    .filter(Boolean);
  const out = new Headers();
  src.forEach((value, key) => {
    const name = key.toLowerCase();
    if (!stripped.has(name) && !connectionTokens.includes(name)) out.append(key, value);
  });
  return out;
}

function buildTarget(subPath: string, search: string): URL | null {
  if (!subPath || subPath.startsWith('/') || subPath.includes('\\')) {
    return null;
  }
  const segments = subPath.split('/');
  if (segments.some((s) => s === '..' || s === '.' || decodeSafe(s) === '..')) return null;

  const upstreamPath = subPath.startsWith('auth/') ? `/api/${subPath}` : `/${subPath}`;
  let target: URL;
  try {
    target = new URL(`${apiBase.origin}${apiBasePath}${upstreamPath}${search}`);
  } catch {
    return null;
  }
  return target.origin === apiBase.origin ? target : null;
}

function decodeSafe(segment: string): string {
  try {
    return decodeURIComponent(segment);
  } catch {
    return segment;
  }
}

const handler: APIRoute = async ({ request, params }) => {
  const subPath = Array.isArray(params.path) ? params.path.join('/') : (params.path ?? '');
  const incoming = new URL(request.url);
  const target = buildTarget(subPath, incoming.search);

  if (!target) {
    return new Response(JSON.stringify({ message: 'Invalid path' }), {
      status: 400,
      headers: { 'content-type': 'application/json' },
    });
  }

  const init: RequestInit = {
    method: request.method,
    headers: filterHeaders(request.headers, STRIPPED_REQUEST_HEADERS),
    redirect: 'manual',
    signal: request.signal,
  };

  if (request.method !== 'GET' && request.method !== 'HEAD') {
    init.body = await request.arrayBuffer();
  }

  let upstream: Response;
  try {
    upstream = await fetch(target, init);
  } catch (err) {
    console.error(`Proxy ${request.method} ${target.pathname} failed`, err);
    return new Response(JSON.stringify({ message: 'Upstream API unreachable' }), {
      status: 502,
      headers: { 'content-type': 'application/json' },
    });
  }

  return new Response(upstream.body, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers: filterHeaders(upstream.headers, STRIPPED_RESPONSE_HEADERS),
  });
};

export const GET = handler;
export const POST = handler;
export const PUT = handler;
export const PATCH = handler;
export const DELETE = handler;
export const OPTIONS = handler;
export const HEAD = handler;
