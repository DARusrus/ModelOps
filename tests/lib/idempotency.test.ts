import { describe, expect, it, vi } from 'vitest';
vi.mock('server-only', () => ({}));
import { claimIdempotency, idempotencyKey, requestFingerprint } from '../../src/lib/idempotency';

const context = { organizationId: '00000000-0000-4000-8000-000000000001', actorId: '00000000-0000-4000-8000-000000000002', operation: 'evaluation.create', key: '00000000-0000-4000-8000-000000000003', fingerprint: 'abc' };

describe('idempotency boundary', () => {
  it('requires a UUID header instead of trusting an arbitrary identifier', () => {
    expect(() => idempotencyKey(new Request('https://example.test'))).toThrow('IDEMPOTENCY_REQUIRED');
    expect(idempotencyKey(new Request('https://example.test', { headers: { 'Idempotency-Key': context.key } }))).toBe(context.key);
  });

  it('creates a stable fingerprint for equivalent payloads', () => {
    expect(requestFingerprint({ action: 'submitted', reason: 'review' })).toBe(requestFingerprint({ action: 'submitted', reason: 'review' }));
    expect(requestFingerprint({ action: 'submitted', nested: { reason: 'review', policy: 'enterprise' } })).toBe(requestFingerprint({ nested: { policy: 'enterprise', reason: 'review' }, action: 'submitted' }));
  });

  it('returns a completed stored response for a replay', async () => {
    const client = { rpc: async () => ({ data: { action: 'replay', response_status: 200, response_body: { success: true } }, error: null }) };
    await expect(claimIdempotency(client, context)).resolves.toEqual({ action: 'replay', response_status: 200, response_body: { success: true } });
  });

  it('fails closed when the idempotency store is unavailable', async () => {
    const client = { rpc: async () => ({ data: null, error: { message: 'offline' } }) };
    await expect(claimIdempotency(client, context)).rejects.toThrow('IDEMPOTENCY_UNAVAILABLE');
  });
});
