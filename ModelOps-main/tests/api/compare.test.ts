import { describe, it, expect } from 'vitest';
import { POST } from '../../src/app/api/modelops/compare/route';
import { MetricDiff } from '../../src/types';

describe('POST /api/modelops/compare', () => {
  it('should return 400 for invalid JSON body', async () => {
    // Provide a request that throws on .json() (e.g. using a mock)
    const request = new Request('http://localhost/api/modelops/compare', {
      method: 'POST',
      body: 'invalid-json',
    });

    const response = await POST(request);
    expect(response.status).toBe(400);

    const data = await response.json();
    expect(data.success).toBe(false);
    expect(data.error).toMatch(/Invalid JSON payload/i);
  });

  it('should return 400 when missing required fields in payload', async () => {
    const payload = {
      run1: { model_name: 'A' },
      // run2 is missing entirely
    };

    const request = new Request('http://localhost/api/modelops/compare', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const response = await POST(request);
    expect(response.status).toBe(400);

    const data = await response.json();
    expect(data.success).toBe(false);
    expect(data.error).toMatch(/Input validation failed/i);
    expect(Array.isArray(data.details)).toBe(true);
  });

  it('should return 200 with valid payload', async () => {
    const payload = {
      run1: {
        model_name: 'Model-A',
        metrics: { accuracy: 0.90, latency: 100 },
      },
      run2: {
        model_name: 'Model-B',
        metrics: { accuracy: 0.95, latency: 120 },
      },
    };

    const request = new Request('http://localhost/api/modelops/compare', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const response = await POST(request);
    expect(response.status).toBe(200);

    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.comparison.readiness_delta).toBeDefined();

    // Verify that the metrics comparison exists
    const diffs = data.comparison.metrics_diff;
    expect(diffs).toBeDefined();
    expect(diffs.length).toBeGreaterThan(0);
    const accDiff = diffs.find((d: MetricDiff) => d.metric_name === 'accuracy');
    expect(accDiff).toBeDefined();
    expect(accDiff!.delta).toBeCloseTo(0.05);
    expect(accDiff!.direction).toBe('improved'); // Assuming higher accuracy is improved
  });
});
