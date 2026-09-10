import { describe, expect, it, vi } from 'vitest';
import { createAsyncTtlCache } from '../../src/lib/health/async-ttl-cache';

describe('async TTL cache', () => {
  it('coalesces concurrent loads and refreshes only after expiry', async () => {
    let now = 1_000;
    let resolveLoad!: (value: string) => void;
    const loader = vi.fn(() => new Promise<string>((resolve) => { resolveLoad = resolve; }));
    const read = createAsyncTtlCache(loader, 5_000, () => now);

    const first = read();
    const concurrent = read();
    expect(loader).toHaveBeenCalledOnce();
    resolveLoad('ready');
    await expect(Promise.all([first, concurrent])).resolves.toEqual(['ready', 'ready']);

    now = 5_999;
    await expect(read()).resolves.toBe('ready');
    expect(loader).toHaveBeenCalledOnce();

    now = 6_000;
    const refreshed = read();
    resolveLoad('refreshed');
    await expect(refreshed).resolves.toBe('refreshed');
    expect(loader).toHaveBeenCalledTimes(2);
  });

  it('does not cache a rejected load', async () => {
    const loader = vi.fn()
      .mockRejectedValueOnce(new Error('temporary failure'))
      .mockResolvedValueOnce('recovered');
    const read = createAsyncTtlCache(loader, 5_000);

    await expect(read()).rejects.toThrow('temporary failure');
    await expect(read()).resolves.toBe('recovered');
    expect(loader).toHaveBeenCalledTimes(2);
  });
});
