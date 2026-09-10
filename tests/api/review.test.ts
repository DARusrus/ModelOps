import { beforeEach, describe, expect, it, vi } from 'vitest';

const cardId = '00000000-0000-4000-8000-000000000001';
const organizationId = '00000000-0000-4000-8000-000000000002';
const actorId = '00000000-0000-4000-8000-000000000003';

const mocks = vi.hoisted(() => ({
  adminClient: vi.fn(),
  requireActor: vi.fn(),
  claim: vi.fn(),
  abandon: vi.fn(),
  idempotencyKey: vi.fn(),
  fingerprint: vi.fn(),
}));

vi.mock('../../src/lib/auth/actor', () => ({ requireDefaultActor: mocks.requireActor }));
vi.mock('../../src/lib/supabase/admin', () => ({ createSupabaseAdminClient: mocks.adminClient }));
vi.mock('../../src/lib/idempotency', () => ({
  abandonIdempotency: mocks.abandon,
  claimIdempotency: mocks.claim,
  idempotencyKey: mocks.idempotencyKey,
  requestFingerprint: mocks.fingerprint,
}));

import { POST } from '../../src/app/api/modelops/[id]/review/route';

function query(data: unknown) {
  return {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    gt: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue({ data, error: null }),
  };
}

describe('POST /api/modelops/[id]/review', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireActor.mockResolvedValue({ userId: actorId, organizationId, role: 'admin' });
    mocks.claim.mockResolvedValue({ action: 'claimed' });
    mocks.idempotencyKey.mockReturnValue('00000000-0000-4000-8000-000000000004');
    mocks.fingerprint.mockReturnValue('a'.repeat(64));
  });

  it('returns the public DTO completed by the atomic review RPC', async () => {
    const attestation = {
      id: '00000000-0000-4000-8000-000000000005', action: 'submitted', reason: 'Ready for review.', rubric_version: '2026-09-03.2',
      policy_id: 'enterprise_general', previous_digest: null, digest: 'a'.repeat(64), sequence_no: 1, digest_version: 'v2', created_at: '2026-09-07T00:00:00.000+00:00',
      organization_id: organizationId, model_card_id: cardId, model_card_reference: cardId, actor_id: actorId, evidence_snapshot: [], expires_at: '2033-09-07T00:00:00.000+00:00',
    };
    const cardQuery = query({ organization_id: organizationId, created_by: actorId, workflow_state: 'draft', payload: { model_name: 'Review card', version: '1.0.0', dataset: 'benchmark', intended_use: 'review validation', readiness_score: 50 } });
    const organizationQuery = query({ review_mode: 'self_attestation' });
    const client = {
      from: vi.fn((table: string) => table === 'model_cards' ? cardQuery : organizationQuery),
      rpc: vi.fn().mockResolvedValue({
        data: {
          success: true,
          workflow_state: 'submitted',
          attestation: {
            id: attestation.id, action: attestation.action, reason: attestation.reason,
            rubric_version: attestation.rubric_version, policy_id: attestation.policy_id,
            previous_digest: attestation.previous_digest, digest: attestation.digest,
            sequence_no: attestation.sequence_no, digest_version: attestation.digest_version,
            created_at: attestation.created_at,
          },
          policy: {
            policy: { id: 'enterprise_general', name: 'Enterprise General', domain: 'General', min_score: 0, description: 'General policy', mandatory_rules: [] },
            isPassed: true, scoreDelta: 0, unmetRules: [], statusText: 'POLICY_PASSED', justification: 'Policy passed.',
          },
        },
        error: null,
      }),
    };
    mocks.adminClient.mockReturnValue(client);

    const response = await POST(new Request(`https://example.test/api/modelops/${cardId}/review`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'submitted', reason: 'Ready for review.', policy_id: 'enterprise_general' }),
    }), { params: Promise.resolve({ id: cardId }) });

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toMatchObject({ success: true, workflow_state: 'submitted', attestation: { id: attestation.id, sequence_no: 1 } });
    expect(body.attestation).not.toHaveProperty('organization_id');
    expect(body.attestation).not.toHaveProperty('evidence_snapshot');
    expect(client.rpc).toHaveBeenCalledWith('attest_model_card_idempotently', expect.objectContaining({
      target_org: organizationId,
      requesting_actor: actorId,
      target_card: cardId,
      target_operation: `review.${cardId}`,
    }));
  });

  it('reports malformed review input as a client validation error before database access', async () => {
    const response = await POST(new Request(`https://example.test/api/modelops/${cardId}/review`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'draft', reason: 'Invalid action', policy_id: 'enterprise_general' }),
    }), { params: Promise.resolve({ id: cardId }) });

    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({ success: false, code: 'VALIDATION_FAILED' });
    expect(mocks.adminClient).not.toHaveBeenCalled();
  });
});
