import type { APIRoute } from 'astro';
import { SERVER_API_URL } from '@/lib/env';

export const prerender = false;

// Headers we must NOT forward upstream/back to the client.
// `host` would break virtual hosting; hop-by-hop headers per RFC 7230.
const HOP_BY_HOP = new Set([
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
]);

function filterHeaders(src: Headers): Headers {
  const out = new Headers();
  src.forEach((value, key) => {
    if (!HOP_BY_HOP.has(key.toLowerCase())) out.append(key, value);
  });
  return out;
}

const handler: APIRoute = async ({ request, params }) => {
  const subPath = Array.isArray(params.path) ? params.path.join('/') : (params.path ?? '');
  const incoming = new URL(request.url);
  const target = new URL(`/api/${subPath}${incoming.search}`, SERVER_API_URL);

  const init: RequestInit = {
    method: request.method,
    headers: filterHeaders(request.headers),
    redirect: 'manual',
  };

  // Only attach a body for methods that allow one.
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    init.body = await request.arrayBuffer();
  }

  let upstream: Response;
  try {
    upstream = await fetch(target, init);
  } catch (err) {
    return new Response(
      JSON.stringify({ message: 'Upstream API unreachable', error: String(err) }),
      { status: 502, headers: { 'content-type': 'application/json' } },
    );
  }

  // Pass through status + headers (including Set-Cookie). Strip hop-by-hop.
  const respHeaders = filterHeaders(upstream.headers);
  return new Response(upstream.body, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers: respHeaders,
  });
};

export const GET = handler;
export const POST = handler;
export const PUT = handler;
export const PATCH = handler;
export const DELETE = handler;
export const OPTIONS = handler;
export const HEAD = handler;
