import { afterEach, describe, expect, it, vi } from 'vitest';
import { requestJson } from '../../src/lib/client/api';

describe('browser API client', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('returns parsed JSON without retrying a mutation', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({ success: true }), { status: 200 }));
    await expect(requestJson('/api/example', { method: 'POST', body: '{}' })).resolves.toEqual({ success: true });
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it('preserves typed server error fields for UI decisions', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({ error: 'Invalid input', code: 'VALIDATION_FAILED', details: [{ path: 'model_name', message: 'Required' }] }), { status: 400 }));
    await expect(requestJson('/api/example')).rejects.toMatchObject({
      name: 'ApiClientError', status: 400, code: 'VALIDATION_FAILED', details: [{ path: 'model_name', message: 'Required' }],
    });
  });

  it('turns a stalled request into a typed timeout', async () => {
    vi.useFakeTimers();
    vi.spyOn(globalThis, 'fetch').mockImplementation((_input, init) => new Promise((_resolve, reject) => {
      init?.signal?.addEventListener('abort', () => reject(init.signal?.reason), { once: true });
    }));
    const request = requestJson('/api/example', {}, 1_000);
    const rejection = expect(request).rejects.toEqual(expect.objectContaining({ status: 408, code: 'CLIENT_TIMEOUT' }));
    await vi.advanceTimersByTimeAsync(1_000);
    await rejection;
  });

  it('rejects malformed success bodies instead of passing ambiguous data to the UI', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('<html>not json</html>', { status: 200 }));
    await expect(requestJson('/api/example')).rejects.toMatchObject({ status: 200, code: 'INVALID_RESPONSE' });
  });
});
