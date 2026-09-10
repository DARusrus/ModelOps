import { beforeEach, describe, expect, it, vi } from 'vitest';

const actor = { userId: 'user-1', organizationId: '00000000-0000-4000-8000-000000000001', role: 'admin' };
const baselineId = '00000000-0000-4000-8000-000000000010';
const candidateId = '00000000-0000-4000-8000-000000000020';

function savedCard(id: string, modelName: string, accuracy: number): {
  id: string;
  payload: {
    model_name: string; version: string; dataset: string; metrics: Record<string, number>;
    intended_use: string; readiness_score: number; decision: 'pending_human_review'; evidence_items: [];
  };
} {
  return {
    id,
    payload: {
      model_name: modelName,
      version: '1.0.0',
      dataset: 'benchmark',
      metrics: { accuracy },
      intended_use: 'validation',
      readiness_score: 25,
      decision: 'pending_human_review',
      evidence_items: [],
    },
  };
}

function supabaseWith(records: unknown[], rateAllowed = true) {
  const query = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    gt: vi.fn().mockResolvedValue({ data: records, error: null }),
  };
  return {
    rpc: vi.fn().mockResolvedValue({ data: rateAllowed, error: null }),
    from: vi.fn().mockReturnValue(query),
    query,
  };
}

const dependencies = vi.hoisted(() => ({ client: null as unknown as ReturnType<typeof supabaseWith> }));
vi.mock('../../src/lib/auth/actor', () => ({ requireDefaultActor: vi.fn().mockResolvedValue({ userId: 'user-1', organizationId: '00000000-0000-4000-8000-000000000001', role: 'admin' }) }));
vi.mock('../../src/lib/supabase/server', () => ({ createSupabaseServerClient: vi.fn().mockImplementation(async () => dependencies.client) }));

import { POST } from '../../src/app/api/modelops/compare/route';

describe('POST /api/modelops/compare', () => {
  beforeEach(() => { dependencies.client = supabaseWith([]); });

  it('rejects a non-JSON content type before parsing the body', async () => {
    const response = await POST(new Request('http://localhost/api/modelops/compare', { method: 'POST', body: 'invalid-json' }));
    expect(response.status).toBe(415);
    expect((await response.json()).code).toBe('UNSUPPORTED_MEDIA_TYPE');
  });

  it('returns a retryable 429 when the shared request budget is exhausted', async () => {
    dependencies.client = supabaseWith([], false);
    const response = await POST(new Request('http://localhost/api/modelops/compare', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ baseline_id: baselineId, candidate_id: candidateId }),
    }));
    expect(response.status).toBe(429);
    expect(response.headers.get('Retry-After')).toBe('60');
    expect(await response.json()).toMatchObject({ success: false, code: 'RATE_LIMITED' });
  });

  it('rejects client-supplied run objects instead of treating them as authorized records', async () => {
    const response = await POST(new Request('http://localhost/api/modelops/compare', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ run1: { model_name: 'A' }, run2: { model_name: 'B' } }),
    }));
    expect(response.status).toBe(400);
  });

  it('loads both saved cards under the active organization before comparing them', async () => {
    dependencies.client = supabaseWith([savedCard(baselineId, 'Model-A', 0.9), savedCard(candidateId, 'Model-B', 0.95)]);
    const response = await POST(new Request('http://localhost/api/modelops/compare', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ baseline_id: baselineId, candidate_id: candidateId }),
    }));
    expect(response.status).toBe(200);
    expect(response.headers.get('Cache-Control')).toBe('no-store');
    expect(dependencies.client.query.eq).toHaveBeenCalledWith('organization_id', actor.organizationId);
    expect(dependencies.client.query.in).toHaveBeenCalledWith('id', [baselineId, candidateId]);
    const data = await response.json();
    expect(data.comparison.metrics_diff.find((item: { metric_name: string }) => item.metric_name === 'accuracy').direction).toBe('improved');
  });

  it('returns not found without revealing a cross-organization or expired record', async () => {
    dependencies.client = supabaseWith([savedCard(baselineId, 'Model-A', 0.9)]);
    const response = await POST(new Request('http://localhost/api/modelops/compare', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ baseline_id: baselineId, candidate_id: candidateId }),
    }));
    expect(response.status).toBe(404);
  });

  it('returns a valid not-measured comparison instead of failing response validation', async () => {
    const baseline = savedCard(baselineId, 'Model-A', 0.9);
    const candidate = savedCard(candidateId, 'Model-B', 0.95);
    candidate.payload.metrics = { accuracy: 0.95, f1: 0.8 };
    dependencies.client = supabaseWith([baseline, candidate]);
    const response = await POST(new Request('http://localhost/api/modelops/compare', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ baseline_id: baselineId, candidate_id: candidateId }),
    }));
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.comparison.metrics_diff.find((item: { metric_name: string }) => item.metric_name === 'f1')).toMatchObject({
      run1_value: null, run2_value: 0.8, delta: null, direction: 'unchanged', comparison_status: 'not_measured',
    });
  });
});
