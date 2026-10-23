import { Injectable } from '@nestjs/common';
import { OPENAI_RESOURCE } from './chatgpt-oauth.client.js';

export type ResponseItem = Record<string, unknown> & { type: string };

export interface ResponsesRequest {
  model: string;
  instructions: string;
  input: Record<string, unknown>[];
  tools: Record<string, unknown>[];
  reasoning: { effort: string };
}

export class ResponsesApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

function errorFromBody(status: number, text: string): ResponsesApiError {
  let json: { error?: { code?: string; message?: string }; detail?: string } = {};
  try {
    json = JSON.parse(text) as typeof json;
  } catch {
    json = {};
  }
  return new ResponsesApiError(
    status,
    json.error?.code ?? `http_${status}`,
    json.error?.message ?? json.detail ?? text.slice(0, 500),
  );
}

@Injectable()
export class ResponsesClient {
  async stream(
    token: string,
    request: ResponsesRequest,
    onTextDelta: (text: string) => void,
    signal?: AbortSignal,
  ): Promise<ResponseItem[]> {
    const res = await fetch(`${OPENAI_RESOURCE}/responses`, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${token}`,
        'content-type': 'application/json',
        accept: 'text/event-stream',
      },
      body: JSON.stringify({
        ...request,
        store: false,
        stream: true,
        include: ['reasoning.encrypted_content'],
      }),
      signal,
    });

    if (!res.ok || !res.body) {
      throw errorFromBody(res.status, await res.text());
    }

    const items: ResponseItem[] = [];
    let completed = false;
    const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
    let buffer = '';

    const handle = (raw: string) => {
      const data = raw
        .split(/\r?\n/)
        .filter((line) => line.startsWith('data:'))
        .map((line) => line.slice(5).trimStart())
        .join('\n');
      if (!data || data === '[DONE]') return;
      const event = JSON.parse(data) as Record<string, unknown> & { type: string };

      switch (event.type) {
        case 'response.output_text.delta':
          onTextDelta(String(event.delta ?? ''));
          break;
        case 'response.output_item.done':
          items.push(event.item as ResponseItem);
          break;
        case 'response.completed':
          completed = true;
          break;
        case 'response.failed': {
          const error = (event.response as { error?: { code?: string; message?: string } })?.error;
          throw new ResponsesApiError(
            200,
            error?.code ?? 'response_failed',
            error?.message ?? 'Response failed',
          );
        }
        case 'response.incomplete': {
          const details = (event.response as { incomplete_details?: { reason?: string } })
            ?.incomplete_details;
          throw new ResponsesApiError(
            200,
            'response_incomplete',
            details?.reason ?? 'Response incomplete',
          );
        }
        case 'error':
          throw new ResponsesApiError(
            200,
            String(event.code ?? 'stream_error'),
            String(event.message ?? 'Stream error'),
          );
      }
    };

    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += value;
      const chunks = buffer.split(/\r?\n\r?\n/);
      buffer = chunks.pop() ?? '';
      for (const chunk of chunks) handle(chunk);
    }
    if (buffer.trim()) handle(buffer);

    if (!completed) throw new ResponsesApiError(200, 'stream_interrupted', 'Stream ended early');
    return items;
  }
}
