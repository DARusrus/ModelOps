import { describe, expect, it } from 'vitest';
import { MAX_JSON_BODY_BYTES, readJsonRequest, withRequestId } from '../../src/lib/http';

describe('readJsonRequest', () => {
  it('requires an explicit JSON content type', async () => {
    const result = await readJsonRequest(new Request('https://example.test', { method: 'POST', body: '{}' }));
    expect('error' in result).toBe(true);
    if ('error' in result) expect(result.error.status).toBe(415);
  });

  it('parses a valid bounded JSON body', async () => {
    const result = await readJsonRequest(new Request('https://example.test', { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{"model_name":"safe"}' }));
    expect(result).toEqual({ body: { model_name: 'safe' } });
  });

  it('rejects an oversized chunked body without trusting Content-Length', async () => {
    const oversized = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(new TextEncoder().encode(`"${'x'.repeat(MAX_JSON_BODY_BYTES + 1)}"`));
        controller.close();
      },
    });
    const request = new Request('https://example.test', { method: 'POST', headers: { 'content-type': 'application/json' }, body: oversized, duplex: 'half' } as RequestInit);
    const result = await readJsonRequest(request);
    expect('error' in result).toBe(true);
    if ('error' in result) expect(result.error.status).toBe(413);
  });

  it('preserves the server proxy correlation ID on every wrapped response', async () => {
    const requestId = 'a8f0c345-8b9e-45f0-a3bc-cc565fb6094c';
    const handler = withRequestId(async () => new Response('ok'));
    const response = await handler(new Request('https://example.test/api', { headers: { 'x-request-id': requestId } }));
    expect(response.headers.get('X-Request-Id')).toBe(requestId);
  });
});
