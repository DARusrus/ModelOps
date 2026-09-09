import { describe, expect, it, vi } from 'vitest';
import { assertProviderAvailable, recordProviderFailure, recordProviderSuccess, type ProviderCircuitClient } from '../../src/lib/ai/circuit-breaker';

function rpcClient(response: { data: boolean | null; error: { message: string } | null }): ProviderCircuitClient {
  return { rpc: vi.fn().mockResolvedValue(response) };
}

describe('shared provider circuit breaker', () => {
  it('permits egress only when the shared database circuit allows it', async () => {
    const client = rpcClient({ data: true, error: null });
    await expect(assertProviderAvailable('groq', client)).resolves.toBeUndefined();
    expect(client.rpc).toHaveBeenCalledWith('provider_circuit_available', { target_provider: 'groq' });
  });

  it('fails closed when the circuit is open or its shared store is unavailable', async () => {
    await expect(assertProviderAvailable('gemini', rpcClient({ data: false, error: null }))).rejects.toThrow('PROVIDER_CIRCUIT_OPEN');
    await expect(assertProviderAvailable('gemini', rpcClient({ data: null, error: { message: 'offline' } }))).rejects.toThrow('PROVIDER_CIRCUIT_UNAVAILABLE');
  });

  it('records success and retryable failure through server-only RPCs', async () => {
    const client = rpcClient({ data: null, error: null });
    await recordProviderSuccess('groq', client);
    await recordProviderFailure('gemini', client);
    expect(client.rpc).toHaveBeenNthCalledWith(1, 'record_provider_circuit_success', { target_provider: 'groq' });
    expect(client.rpc).toHaveBeenNthCalledWith(2, 'record_provider_circuit_failure', { target_provider: 'gemini', failure_threshold: 3, cooldown_seconds: 30 });
  });
});
