import 'server-only';
import { createHash } from 'crypto';
import { z } from 'zod';

const KeySchema = z.string().uuid();
type Claim = { action: 'claimed' } | { action: 'in_progress' } | { action: 'conflict' } | { action: 'replay'; response_status: number; response_body: unknown };
type RpcClient = { rpc(name: string, args: Record<string, unknown>): PromiseLike<{ data: unknown; error: unknown }> };

export function idempotencyKey(request: Request): string {
  const parsed = KeySchema.safeParse(request.headers.get('Idempotency-Key'));
  if (!parsed.success) throw new Error('IDEMPOTENCY_REQUIRED');
  return parsed.data;
}
function canonicalJson(value: unknown): string {
  if (value === null || typeof value === 'boolean' || typeof value === 'number' || typeof value === 'string') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
  if (typeof value === 'object') {
    return `{${Object.entries(value as Record<string, unknown>)
      .filter(([, child]) => child !== undefined)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, child]) => `${JSON.stringify(key)}:${canonicalJson(child)}`)
      .join(',')}}`;
  }
  throw new Error('IDEMPOTENCY_FINGERPRINT_INVALID');
}
export function requestFingerprint(payload: unknown): string { return createHash('sha256').update(canonicalJson(payload)).digest('hex'); }
export async function claimIdempotency(client: RpcClient, context: { organizationId: string; actorId: string; operation: string; key: string; fingerprint: string }): Promise<Claim> {
  const { data, error } = await client.rpc('claim_idempotency', { target_org: context.organizationId, requesting_actor: context.actorId, target_operation: context.operation, target_key: context.key, fingerprint: context.fingerprint });
  if (error) throw new Error('IDEMPOTENCY_UNAVAILABLE');
  const parsed = z.object({ action: z.enum(['claimed', 'in_progress', 'conflict', 'replay']), response_status: z.number().int().optional(), response_body: z.unknown().optional() }).parse(data);
  if (parsed.action === 'replay' && parsed.response_status !== undefined) return { action: 'replay', response_status: parsed.response_status, response_body: parsed.response_body };
  return { action: parsed.action } as Claim;
}
export async function completeIdempotency(client: RpcClient, context: { organizationId: string; actorId: string; operation: string; key: string; fingerprint: string }, status: number, body: unknown) {
  const { error } = await client.rpc('complete_idempotency', { target_org: context.organizationId, requesting_actor: context.actorId, target_operation: context.operation, target_key: context.key, fingerprint: context.fingerprint, status_code: status, body });
  if (error) throw new Error('IDEMPOTENCY_UNAVAILABLE');
}
export async function abandonIdempotency(client: RpcClient, context: { organizationId: string; actorId: string; operation: string; key: string; fingerprint: string }) {
  await client.rpc('abandon_idempotency', { target_org: context.organizationId, requesting_actor: context.actorId, target_operation: context.operation, target_key: context.key, fingerprint: context.fingerprint });
}
