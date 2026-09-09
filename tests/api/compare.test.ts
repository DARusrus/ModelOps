import { beforeEach, describe, expect, it, vi } from 'vitest';

const actor = { userId: 'user-1', organizationId: '00000000-0000-4000-8000-000000000001', role: 'admin' };
const baselineId = '00000000-0000-4000-8000-000000000010';
const candidateId = '00000000-0000-4000-8000-000000000020';

function savedCard(id: string, modelName: string, accuracy: number) {
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

function supabaseWith(records: unknown[]) {
  const query = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    gt: vi.fn().mockResolvedValue({ data: records, error: null }),
  };
  return {
    rpc: vi.fn().mockResolvedValue({ data: true, error: null }),
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
});
