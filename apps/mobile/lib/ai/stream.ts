import { fetch } from 'expo/fetch';
import type { AiStreamFrame } from '@tutor-finance/shared';
import { authHeaders, buildUrl, toApiError } from '~/lib/api';

const NEWLINE = 10;

function concat(a: Uint8Array, b: Uint8Array): Uint8Array {
  const out = new Uint8Array(a.length + b.length);
  out.set(a, 0);
  out.set(b, a.length);
  return out;
}

function parseBlock(block: string): AiStreamFrame | null {
  let event = '';
  let seq = 0;
  let data = '';
  for (const line of block.split('\n')) {
    if (line.startsWith('id:')) seq = Number(line.slice(3).trim()) || 0;
    else if (line.startsWith('event:')) event = line.slice(6).trim();
    else if (line.startsWith('data:')) data += line.slice(5).trim();
  }
  if (!event || !data) return null;
  try {
    return { event, seq, data: JSON.parse(data) } as AiStreamFrame;
  } catch {
    return null;
  }
}

export async function streamRun(
  threadId: string,
  after: number,
  signal: AbortSignal,
  onFrame: (frame: AiStreamFrame) => void,
): Promise<void> {
  const path = `ai/threads/${threadId}/stream`;
  const res = await fetch(buildUrl(path, { after }), {
    signal,
    credentials: 'omit',
    headers: { accept: 'text/event-stream', ...authHeaders() },
  });
  if (!res.ok) throw toApiError(res, path, await res.text());
  if (!res.body) throw new Error('Empty response');

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let bytes: Uint8Array = new Uint8Array(0);
  let text = '';

  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    bytes = concat(bytes, value);
    // Decode only up to the last newline so multi-byte UTF-8 chars are never split.
    const cut = bytes.lastIndexOf(NEWLINE);
    if (cut === -1) continue;
    text += decoder.decode(bytes.slice(0, cut + 1));
    bytes = bytes.slice(cut + 1);

    const blocks = text.split('\n\n');
    text = blocks.pop() ?? '';
    for (const block of blocks) {
      const event = parseBlock(block);
      if (event) onFrame(event);
    }
  }
}
