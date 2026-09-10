import { afterEach, describe, expect, it, vi } from 'vitest';
import { createTimeoutFetch } from '../../src/lib/network/timeout';

describe('timeout-aware fetch', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('aborts a stalled request at the configured boundary', async () => {
    vi.useFakeTimers();
    const baseFetch = vi.fn((_input: RequestInfo | URL, init?: RequestInit) => new Promise<Response>((_resolve, reject) => {
      init?.signal?.addEventListener('abort', () => reject(init.signal?.reason), { once: true });
    })) as unknown as typeof fetch;
    const boundedFetch = createTimeoutFetch(1_000, baseFetch);

    const request = boundedFetch('https://database.example.test');
    const rejection = expect(request).rejects.toMatchObject({ name: 'TimeoutError' });
    await vi.advanceTimersByTimeAsync(1_000);
    await rejection;
    expect(baseFetch).toHaveBeenCalledOnce();
  });

  it('propagates caller cancellation without waiting for its own timeout', async () => {
    vi.useFakeTimers();
    const baseFetch = vi.fn((_input: RequestInfo | URL, init?: RequestInit) => new Promise<Response>((_resolve, reject) => {
      init?.signal?.addEventListener('abort', () => reject(init.signal?.reason), { once: true });
    })) as unknown as typeof fetch;
    const boundedFetch = createTimeoutFetch(10_000, baseFetch);
    const caller = new AbortController();

    const request = boundedFetch('https://database.example.test', { signal: caller.signal });
    caller.abort(new DOMException('Navigation cancelled', 'AbortError'));
    await expect(request).rejects.toMatchObject({ name: 'AbortError' });
    expect(vi.getTimerCount()).toBe(0);
  });
});
