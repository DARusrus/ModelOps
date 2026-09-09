import 'server-only';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';

export type ProviderName = 'groq' | 'gemini';

type CircuitRpcResult = { data: boolean | null; error: { message: string } | null };
type CircuitWriteRpcResult = { data: unknown; error: { message: string } | null };
export type ProviderCircuitClient = {
  rpc: (name: string, args: Record<string, unknown>) => PromiseLike<CircuitRpcResult | CircuitWriteRpcResult>;
};

function circuitClient(): ProviderCircuitClient {
  return createSupabaseAdminClient();
}

function ensureCircuitWrite(result: CircuitRpcResult | CircuitWriteRpcResult): void {
  if (result.error) throw new Error('PROVIDER_CIRCUIT_UNAVAILABLE');
}

/**
 * Checks the shared circuit before egress. If the circuit store is unavailable,
 * fail closed: governed evidence must not leave the service while dependency
 * controls are unknown.
 */
export async function assertProviderAvailable(provider: ProviderName, client = circuitClient()): Promise<void> {
  const result = await client.rpc('provider_circuit_available', { target_provider: provider }) as CircuitRpcResult;
  if (result.error || result.data !== true) {
    if (result.error) throw new Error('PROVIDER_CIRCUIT_UNAVAILABLE');
    throw new Error('PROVIDER_CIRCUIT_OPEN');
  }
}

export async function recordProviderSuccess(provider: ProviderName, client = circuitClient()): Promise<void> {
  ensureCircuitWrite(await client.rpc('record_provider_circuit_success', { target_provider: provider }));
}

export async function recordProviderFailure(provider: ProviderName, client = circuitClient()): Promise<void> {
  ensureCircuitWrite(await client.rpc('record_provider_circuit_failure', {
    target_provider: provider,
    failure_threshold: 3,
    cooldown_seconds: 30,
  }));
}
