import { describe, expect, it } from 'vitest';
import { parseArguments, percentile, summarize } from '../../scripts/load-smoke.mjs';

describe('controlled load smoke utilities', () => {
  it('parses a safe origin and caps concurrency to the request count', () => {
    expect(parseArguments(['https://model-ops.vercel.app', '--requests', '3', '--concurrency', '10'])).toEqual({
      url: 'https://model-ops.vercel.app/api/health', requests: 3, concurrency: 3, timeoutMs: 10_000,
    });
  });

  it('rejects unsafe targets and stress-sized inputs', () => {
    expect(() => parseArguments(['http://example.com'])).toThrow('Use HTTPS');
    expect(() => parseArguments(['https://example.com/api/private'])).toThrow('Provide an origin only');
    expect(() => parseArguments(['https://example.com', '--requests', '501'])).toThrow('between 1 and 500');
    expect(() => parseArguments(['https://example.com', '--concurrency', '51'])).toThrow('between 1 and 50');
  });

  it('calculates nearest-rank percentiles without mutating input', () => {
    const values = [30, 10, 20, 40];
    expect(percentile(values, 50)).toBe(20);
    expect(percentile(values, 95)).toBe(40);
    expect(values).toEqual([30, 10, 20, 40]);
  });

  it('summarizes integrity and transport failures separately', () => {
    expect(summarize([
      { status: 200, healthy: true, requestId: 'a', durationMs: 10 },
      { status: 200, healthy: false, requestId: null, durationMs: 20 },
      { status: 503, healthy: false, requestId: 'c', durationMs: 30 },
      { status: null, healthy: false, requestId: null, durationMs: null },
    ])).toEqual({
      requests: 4, statuses: { 200: 2, 503: 1, transport_error: 1 }, transportErrors: 1,
      serverErrors: 1, unhealthyResponses: 1, missingRequestIds: 1,
      latencyMs: { p50: 20, p95: 30, p99: 30, max: 30 },
    });
  });
});
