import type { AiStreamFrame } from '@tutor-finance/shared';

function parseBlock(block: string): AiStreamFrame | null {
  let event = '';
  let seq = 0;
  const data: string[] = [];
  for (const line of block.split('\n')) {
    if (line.startsWith('id:')) seq = Number(line.slice(3).trim()) || 0;
    else if (line.startsWith('event:')) event = line.slice(6).trim();
    else if (line.startsWith('data:')) data.push(line.slice(5).trimStart());
  }
  if (!event || data.length === 0) return null;
  try {
    return { event, seq, data: JSON.parse(data.join('\n')) } as AiStreamFrame;
  } catch {
    return null;
  }
}

export async function readEventStream(
  body: ReadableStream<Uint8Array>,
  onEvent: (frame: AiStreamFrame) => void,
): Promise<void> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true }).replace(/\r\n/g, '\n');
    let index = buffer.indexOf('\n\n');
    while (index !== -1) {
      const parsed = parseBlock(buffer.slice(0, index));
      buffer = buffer.slice(index + 2);
      if (parsed) onEvent(parsed);
      index = buffer.indexOf('\n\n');
    }
  }
  const tail = parseBlock(buffer.trim());
  if (tail) onEvent(tail);
}
