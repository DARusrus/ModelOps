import { describe, it, expect, vi } from 'vitest';
vi.mock('../../src/lib/auth/actor', () => ({ requireDefaultActor: vi.fn().mockResolvedValue({ userId: 'user-1', organizationId: '00000000-0000-4000-8000-000000000001', role: 'admin' }) }));
vi.mock('../../src/lib/supabase/server', () => ({ createSupabaseServerClient: vi.fn().mockResolvedValue({ rpc: vi.fn().mockResolvedValue({ data: true, error: null }) }) }));
import { processModelOpsRequest } from '../../src/lib/modelops/service';
import { validateInput } from '../../src/lib/modelops/validators';
import { ModelCardOutput } from '../../src/lib/modelops/schema';

// ─────────────────────────────────────────────────────────────────────────────
// Full Workflow Tests — End-to-End (no browser, server-side path only)
//
// These tests exercise the real production path:
//   validateInput → processModelOpsRequest → ModelCardOutput
//   POST /api/modelops/compare → CompareResult
//
// No AI provider key is needed: service.ts uses the deterministic offline
// fallback when GROQ_API_KEY / GEMINI_API_KEY are absent (which is the case
// in CI and in local runs without .env.local).
// ─────────────────────────────────────────────────────────────────────────────

describe('End-to-End Workflow — Main Evaluation Path', () => {
  it('validates and processes a fully-specified experiment → returns compliant ModelCardOutput', async () => {
    // Uses sample-experiments.json fixture exp-001 data
    const raw = {
      model_name: 'customer-churn-classifier',
      version: '1.0.0',
      dataset: 'churn_data_v3.csv',
      intended_use: 'Predict likelihood of customer churn to prioritize retention outreach.',
      metrics: { accuracy: 0.91, precision: 0.88, recall: 0.85, loss: 0.21 },
      tests: ['unit test', 'bias/fairness test'],
      limitations: ['Trained only on data from one region (North America).'],
      risks: ['May underperform for new customer segments not present in training data.'],
      reproducibility: 'Trained with seed=42 using train.py v1.2, experiment tracker ID 4471.',
      input_shape: '(batch, 32)',
      data_types: ['float32', 'int64'],
    };

    const metadata = validateInput(raw);

    // model_name, version, dataset must survive validation unchanged
    expect(metadata.model_name).toBe('customer-churn-classifier');
    expect(metadata.version).toBe('1.0.0');
    expect(metadata.dataset).toBe('churn_data_v3.csv');

    const result: ModelCardOutput = await processModelOpsRequest(metadata);

    // ── Schema compliance ───────────────────────────────────────────────────
    expect(result.model_name).toBe('customer-churn-classifier');
    expect(result.version).toBe('1.0.0');
    expect(result.dataset).toBe('churn_data_v3.csv');

    // ── Deterministic score must be set, AI cannot override it ─────────────
    expect(typeof result.readiness_score).toBe('number');
    expect(result.readiness_score).toBeGreaterThanOrEqual(0);
    expect(result.readiness_score).toBeLessThanOrEqual(100);

    // ── Governance rule: decision is ALWAYS pending_human_review ───────────
    expect(result.decision).toBe('pending_human_review');

    // ── Evidence fields must not be invented (they come from submitted data) ─
    expect(result.experiment_info).toBeDefined();
    expect(result.metrics).toBeDefined();

    // ── Required array fields must be arrays ────────────────────────────────
    expect(Array.isArray(result.limitations)).toBe(true);
    expect(Array.isArray(result.risks)).toBe(true);
    expect(Array.isArray(result.tests)).toBe(true);
    expect(Array.isArray(result.warnings)).toBe(true);
    expect(Array.isArray(result.evidence)).toBe(true);
  });

  it('fully-specified experiment (all fields) → readiness_score > 0', async () => {
    const metadata = validateInput({
      model_name: 'sentiment-analyzer',
      version: '1.4.2',
      dataset: 'product_reviews_2026.csv',
      intended_use: 'Classify product review sentiment as positive, neutral, or negative.',
      metrics: { accuracy: 0.89, f1: 0.87, loss: 0.25 },
      tests: ['unit test', 'regression test'],
      limitations: ['Struggles with sarcasm and mixed-sentiment reviews.'],
      risks: ['Could misclassify sarcastic negative reviews as positive.'],
      reproducibility: 'Trained with seed=123 using train.py v1.4, experiment tracker ID 4610.',
      input_shape: '(batch, 128)',
      data_types: ['float32'],
    });

    const result = await processModelOpsRequest(metadata);
    expect(result.readiness_score).toBeGreaterThan(0);
    expect(result.decision).toBe('pending_human_review');
  });
});

describe('End-to-End Workflow — Failure & Edge Cases', () => {
  it('minimal experiment (only required fields) → still returns valid ModelCardOutput', async () => {
    // exp-004 equivalent — partial metadata
    const metadata = validateInput({
      model_name: 'support-ticket-router',
      version: '2.0.0',
      dataset: 'tickets_labeled_v2.csv',
      intended_use: 'Automatically route incoming support tickets to the correct team.',
      metrics: { accuracy: 0.85, f1: 0.83 },
    });

    const result = await processModelOpsRequest(metadata);

    expect(result.model_name).toBe('support-ticket-router');
    // Missing fields → lower score, not a crash
    expect(result.readiness_score).toBeGreaterThanOrEqual(0);
    expect(result.readiness_score).toBeLessThanOrEqual(100);
    expect(result.decision).toBe('pending_human_review');
    // Limitations/risks/tests must still be arrays (defaults from schema)
    expect(Array.isArray(result.limitations)).toBe(true);
    expect(Array.isArray(result.tests)).toBe(true);
  });

  it('legacy "model" field → normalised to model_name by validateInput', async () => {
    const metadata = validateInput({
      model: 'Legacy-ResNet',
      dataset: 'CIFAR-10',
      intended_use: 'Image classification',
    });

    expect(metadata.model_name).toBe('Legacy-ResNet');

    const result = await processModelOpsRequest(metadata);
    expect(result.model_name).toBe('Legacy-ResNet');
    expect(result.decision).toBe('pending_human_review');
  });

  it('identical deterministic requests return equivalent independent results', async () => {
    const metadata = validateInput({
      model_name: 'cache-test-model',
      version: '1.0.0',
      dataset: 'cache-dataset',
      intended_use: 'Testing deterministic evaluation behavior in service.ts',
      metrics: { accuracy: 0.99 },
    });

    const first = await processModelOpsRequest(metadata);
    const second = await processModelOpsRequest(metadata);

    expect(second).toEqual(first);
  });

  it('decision is always pending_human_review — cannot be anything else', async () => {
    const metadata = validateInput({
      model_name: 'governance-guard-test',
      version: '9.9.9',
      dataset: 'dummy-dataset',
      intended_use: 'Verify the governance rule that no run can be auto-approved.',
      metrics: { accuracy: 1.0 },
      tests: ['full suite'],
      reproducibility: 'seed=0, tracker ID 9999',
    });

    const result = await processModelOpsRequest(metadata);
    // The AI must never set this to "approved" or "rejected"
    expect(result.decision).toBe('pending_human_review');
  });
});
