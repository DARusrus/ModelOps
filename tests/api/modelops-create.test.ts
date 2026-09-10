import { beforeEach, describe, expect, it, vi } from 'vitest';

const organizationId = '00000000-0000-4000-8000-000000000001';
const actorId = '00000000-0000-4000-8000-000000000002';
const requestKey = '00000000-0000-4000-8000-000000000003';
const recordId = '00000000-0000-4000-8000-000000000004';

const result = {
  model_name: 'Atomic model', version: '1.0.0', dataset: 'Benchmark', metrics: {}, intended_use: 'Validation',
  readiness_score: 25, decision: 'pending_human_review' as const, rubric_version: '2026-09-03.2',
};

const mocks = vi.hoisted(() => ({
  adminClient: vi.fn(), serverClient: vi.fn(), requireActor: vi.fn(), process: vi.fn(),
  claim: vi.fn(), abandon: vi.fn(), idempotencyKey: vi.fn(), fingerprint: vi.fn(),
}));

vi.mock('../../src/lib/auth/actor', () => ({ requireDefaultActor: mocks.requireActor }));
vi.mock('../../src/lib/supabase/admin', () => ({ createSupabaseAdminClient: mocks.adminClient }));
vi.mock('../../src/lib/supabase/server', () => ({ createSupabaseServerClient: mocks.serverClient }));
vi.mock('../../src/lib/modelops/service', () => ({
  isPublicNonSensitiveEvaluation: vi.fn().mockReturnValue(false),
  processModelOpsRequest: mocks.process,
}));
vi.mock('../../src/lib/idempotency', () => ({
  abandonIdempotency: mocks.abandon,
  claimIdempotency: mocks.claim,
  idempotencyKey: mocks.idempotencyKey,
  requestFingerprint: mocks.fingerprint,
}));

import { POST } from '../../src/app/api/modelops/route';

function request() {
  return new Request('https://example.test/api/modelops', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Idempotency-Key': requestKey },
    body: JSON.stringify({ model_name: result.model_name, version: result.version, dataset: result.dataset, intended_use: result.intended_use }),
  });
}

describe('POST /api/modelops atomic persistence boundary', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireActor.mockResolvedValue({ userId: actorId, organizationId, role: 'admin' });
    mocks.claim.mockResolvedValue({ action: 'claimed' });
    mocks.idempotencyKey.mockReturnValue(requestKey);
    mocks.fingerprint.mockReturnValue('a'.repeat(64));
    mocks.process.mockResolvedValue(result);
  });

  it('returns a semantically correct unauthenticated API error', async () => {
    mocks.requireActor.mockRejectedValueOnce(new Error('UNAUTHENTICATED'));

    const response = await POST(request());

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({
      success: false,
      code: 'UNAUTHENTICATED',
      error: 'Authentication is required',
    });
    expect(mocks.claim).not.toHaveBeenCalled();
    expect(mocks.process).not.toHaveBeenCalled();
  });

  it('persists the card and completes idempotency through one database RPC', async () => {
    const rpc = vi.fn().mockResolvedValue({ data: { ...result, record_id: recordId }, error: null });
    mocks.adminClient.mockReturnValue({ rpc });
    mocks.serverClient.mockResolvedValue({ rpc: vi.fn().mockResolvedValue({ data: true, error: null }) });

    const response = await POST(request());

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ record_id: recordId, model_name: result.model_name });
    expect(rpc).toHaveBeenCalledOnce();
    expect(rpc).toHaveBeenCalledWith('persist_model_card_idempotently', expect.objectContaining({
      target_org: organizationId,
      requesting_actor: actorId,
      target_operation: 'evaluation.create',
      target_key: requestKey,
      target_fingerprint: 'a'.repeat(64),
      card_payload: result,
    }));
  });

  it('returns 429 and abandons the unused claim before evaluation or persistence', async () => {
    const persistenceRpc = vi.fn();
    mocks.adminClient.mockReturnValue({ rpc: persistenceRpc });
    mocks.serverClient.mockResolvedValue({ rpc: vi.fn().mockResolvedValue({ data: false, error: null }) });

    const response = await POST(request());

    expect(response.status).toBe(429);
    expect(response.headers.get('Retry-After')).toBe('60');
    expect(mocks.abandon).toHaveBeenCalledOnce();
    expect(mocks.process).not.toHaveBeenCalled();
    expect(persistenceRpc).not.toHaveBeenCalled();
  });

  it('abandons the claim when the atomic mutation rolls back', async () => {
    const rpc = vi.fn().mockResolvedValue({ data: null, error: { message: 'transaction rolled back' } });
    mocks.adminClient.mockReturnValue({ rpc });
    mocks.serverClient.mockResolvedValue({ rpc: vi.fn().mockResolvedValue({ data: true, error: null }) });

    const response = await POST(request());

    expect(response.status).toBe(503);
    expect(mocks.abandon).toHaveBeenCalledOnce();
    expect(await response.json()).toMatchObject({ success: false, error: 'Evaluation could not be saved' });
  });
});
