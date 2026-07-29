import { describe, it, expect } from 'vitest';
import { POST } from '../../src/app/api/modelops/route';
import { processModelOpsRequest } from '../../src/lib/modelops/service';
import { validateInput } from '../../src/lib/modelops/validators';

describe('API contract alignment', () => {
  it('exposes readiness and risk reasons in the service response', async () => {
    const metadata = validateInput({
      model_name: 'Contract-Test',
      version: '1.0.0',
      dataset: 'Synthetic',
      intended_use: 'Regression testing',
      metrics: { accuracy: 0.91, f1: 0.89 },
      tests: ['Unit tests'],
      risks: ['Potential bias'],
      limitations: ['Limited coverage'],
      reproducibility: 'Deterministic test run',
    });

    const result = await processModelOpsRequest(metadata);

    expect(Array.isArray(result.readiness.reasons)).toBe(true);
    expect(Array.isArray(result.risk.reasons)).toBe(true);
    expect(result.readiness.reasons.length).toBeGreaterThan(0);
    expect(result.risk.reasons.length).toBeGreaterThan(0);
  });

  it('returns a frontend-friendly response body from the modelops API route', async () => {
    const request = new Request('http://localhost/api/modelops', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        model_name: 'Route-Contract-Test',
        version: '1.0.0',
        dataset: 'Synthetic',
        intended_use: 'Regression testing',
        metrics: { accuracy: 0.91 },
      }),
    });

    const response = await POST(request);
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json).toHaveProperty('data');
    expect(json).not.toHaveProperty('model_card');
    expect(json).toHaveProperty('readiness');
    expect(json).toHaveProperty('risk');
  });
});
