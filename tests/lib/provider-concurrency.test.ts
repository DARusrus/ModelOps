import { describe, expect, it, vi } from 'vitest';
import { withProviderConcurrencyLease } from '../../src/lib/ai/provider-concurrency';

function client(acquire: { data: string | null; error: { message: string } | null }, release = { data: null, error: null }) {
  return { rpc: vi.fn().mockResolvedValueOnce(acquire).mockResolvedValueOnce(release) };
}

describe('shared provider concurrency lease', () => {
  it('runs the provider operation only after a shared lease is acquired and releases it afterwards', async () => {
    const rpcClient = client({ data: '00000000-0000-4000-8000-000000000001', error: null });
    const operation = vi.fn().mockResolvedValue('result');
    await expect(withProviderConcurrencyLease('groq', operation, rpcClient)).resolves.toBe('result');
    expect(rpcClient.rpc).toHaveBeenNthCalledWith(1, 'acquire_provider_concurrency_lease', expect.objectContaining({ target_provider: 'groq' }));
    expect(operation).toHaveBeenCalledOnce();
    expect(rpcClient.rpc).toHaveBeenNthCalledWith(2, 'release_provider_concurrency_lease', { target_lease: '00000000-0000-4000-8000-000000000001' });
  });

  it('does not start an operation when the shared bulkhead is full or unavailable', async () => {
    const full = client({ data: null, error: null });
    const unavailable = client({ data: null, error: { message: 'offline' } });
    const operation = vi.fn();
    await expect(withProviderConcurrencyLease('gemini', operation, full)).rejects.toThrow('PROVIDER_CONCURRENCY_LIMITED');
    await expect(withProviderConcurrencyLease('gemini', operation, unavailable)).rejects.toThrow('PROVIDER_CONCURRENCY_UNAVAILABLE');
    expect(operation).not.toHaveBeenCalled();
  });
});
