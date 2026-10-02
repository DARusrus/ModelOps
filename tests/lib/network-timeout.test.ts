import { afterEach, describe, expect, it, vi } from 'vitest';
import { createTimeoutFetch } from '../../src/lib/network/timeout';

describe('timeout-aware fetch', () => {
  it.each([204, 205, 304])('preserves HTTP %i when a browser exposes an empty body stream', async (status) => {
    vi.useFakeTimers();
    const response = new Response(null, { status, headers: { 'X-Request-Id': 'empty-response' } });
    // Native browser fetch can expose a stream for these bodyless statuses,
    // unlike Node's Response constructor. Model that boundary explicitly.
    Object.defineProperty(response, 'body', { value: new ReadableStream({ start(controller) { controller.close(); } }) });
    const result = await createTimeoutFetch(1_000, vi.fn(async () => response) as typeof fetch)('https://database.example.test');
    expect(result).toBe(response);
    expect(result.status).toBe(status);
    expect(result.headers.get('X-Request-Id')).toBe('empty-response');
    expect(vi.getTimerCount()).toBe(0);
  });

  it('bounds a stalled body even after headers arrive', async () => {
    vi.useFakeTimers();
    const baseFetch = vi.fn(async () => new Response(new ReadableStream())) as typeof fetch;
    const pending = createTimeoutFetch(1_000, baseFetch)('https://database.example.test');
    const assertion = expect(pending).rejects.toMatchObject({ name: 'TimeoutError' });
    await vi.advanceTimersByTimeAsync(1_000);
    await assertion;
    expect(vi.getTimerCount()).toBe(0);
  });

  it('buffers JSON without changing status, headers or cookies', async () => {
    const response = new Response('{"ok":true}', { status: 201, headers: { 'Content-Type': 'application/json', 'X-Request-Id': 'request-1', 'Set-Cookie': 'session=value; HttpOnly' } });
    const result = await createTimeoutFetch(1_000, vi.fn(async () => response) as typeof fetch)('https://database.example.test');
    expect(result.status).toBe(201);
    expect(result.headers.get('X-Request-Id')).toBe('request-1');
    expect(result.headers.get('Set-Cookie')).toBe('session=value; HttpOnly');
    const cloned = result.clone();
    expect(await result.json()).toEqual({ ok: true });
    expect(await cloned.json()).toEqual({ ok: true });
  });

  it('rejects oversized bodies and supports bodyless responses', async () => {
    await expect(createTimeoutFetch(1_000, vi.fn(async () => new Response('too big')) as typeof fetch, 2)('https://database.example.test')).rejects.toThrow('MANAGED_RESPONSE_TOO_LARGE');
    const response = new Response(null, { status: 204 });
    expect(await createTimeoutFetch(1_000, vi.fn(async () => response) as typeof fetch)('https://database.example.test')).toBe(response);
  });

  it('honours cancellation during body consumption', async () => {
    const caller = new AbortController();
    const pending = createTimeoutFetch(10_000, vi.fn(async () => new Response(new ReadableStream())) as typeof fetch)('https://database.example.test', { signal: caller.signal });
    const assertion = expect(pending).rejects.toMatchObject({ name: 'AbortError' });
    await Promise.resolve();
    caller.abort(new DOMException('Cancelled', 'AbortError'));
    await assertion;
  });
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
