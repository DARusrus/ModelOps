import 'server-only';
import { env } from '@/lib/env';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import type { ProviderName } from '@/lib/ai/circuit-breaker';

type LeaseClient = {
  rpc: (name: string, args: Record<string, unknown>) => PromiseLike<{ data: string | null; error: { message: string } | null }>;
};

function leaseClient(): LeaseClient {
  return createSupabaseAdminClient();
}

const LEASE_SECONDS = 35;

export async function withProviderConcurrencyLease<T>(provider: ProviderName, operation: () => Promise<T>, client = leaseClient()): Promise<T> {
  const acquired = await client.rpc('acquire_provider_concurrency_lease', {
    target_provider: provider,
    max_concurrent: env.AI_PROVIDER_MAX_CONCURRENCY,
    lease_seconds: LEASE_SECONDS,
  });
  if (acquired.error) throw new Error('PROVIDER_CONCURRENCY_UNAVAILABLE');
  if (!acquired.data) throw new Error('PROVIDER_CONCURRENCY_LIMITED');

  try {
    return await operation();
  } finally {
    const released = await client.rpc('release_provider_concurrency_lease', { target_lease: acquired.data });
    if (released.error) throw new Error('PROVIDER_CONCURRENCY_UNAVAILABLE');
  }
}
