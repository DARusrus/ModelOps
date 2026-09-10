import { expect, test, type APIResponse, type Page } from '@playwright/test';
import { writeFile } from 'node:fs/promises';
import { createBrowserFixture, removeBrowserFixture, type BrowserFixture } from '../browser/fixtures';

const enabled = process.env.RUN_MODELOPS_PERFORMANCE === 'true';
const performanceDescribe = enabled ? test.describe : test.describe.skip;

type Measurement = { operation: string; status: number; duration_ms: number; request_id: string | null };

function boundedSetting(name: string, fallback: number, minimum: number, maximum: number) {
  const value = Number(process.env[name] || fallback);
  if (!Number.isInteger(value) || value < minimum || value > maximum) {
    throw new Error(`${name} must be an integer between ${minimum} and ${maximum}.`);
  }
  return value;
}

function percentile(values: number[], rank: number) {
  const ordered = [...values].sort((left, right) => left - right);
  return ordered[Math.ceil((rank / 100) * ordered.length) - 1] ?? null;
}

function summarize(measurements: Measurement[]) {
  const groups: Record<string, Measurement[]> = {};
  for (const measurement of measurements) (groups[measurement.operation] ||= []).push(measurement);
  return Object.fromEntries(Object.entries(groups).map(([operation, entries]) => {
    const durations = entries.map((entry) => entry.duration_ms);
    const statuses: Record<string, number> = {};
    for (const entry of entries) statuses[String(entry.status)] = (statuses[String(entry.status)] || 0) + 1;
    return [operation, {
      requests: entries.length,
      statuses,
      missing_request_ids: entries.filter((entry) => !entry.request_id).length,
      latency_ms: { p50: percentile(durations, 50), p95: percentile(durations, 95), p99: percentile(durations, 99), max: Math.max(...durations) },
    }];
  }));
}

async function measured(operation: string, request: () => Promise<APIResponse>): Promise<{ response: APIResponse; measurement: Measurement }> {
  const started = performance.now();
  const response = await request();
  return {
    response,
    measurement: { operation, status: response.status(), duration_ms: Math.round(performance.now() - started), request_id: response.headers()['x-request-id'] || null },
  };
}

async function expectSuccessful(response: APIResponse) {
  if (response.status() !== 200) throw new Error(`Expected HTTP 200, received ${response.status()}: ${await response.text()}`);
}

async function authenticate(page: Page, fixture: BrowserFixture) {
  await page.goto('/login');
  await page.getByLabel('Email').fill(fixture.user.email);
  await page.getByLabel('Password').fill(fixture.user.password);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page).toHaveURL(/\/modelops$/);
}

async function runBounded<T>(count: number, concurrency: number, task: (index: number) => Promise<T>) {
  const results = new Array<T>(count);
  let next = 0;
  async function worker() {
    while (next < count) {
      const index = next++;
      results[index] = await task(index);
    }
  }
  await Promise.all(Array.from({ length: Math.min(count, concurrency) }, () => worker()));
  return results;
}

performanceDescribe('authenticated bounded performance validation', () => {
  let fixture: BrowserFixture | undefined;

  test.beforeAll(async () => { fixture = await createBrowserFixture(); });
  test.afterAll(async () => { await removeBrowserFixture(fixture); });

  test('measures concurrent persistence, review, comparison, and short read stability without exceeding configured budgets', async ({ page }, testInfo) => {
    const createRequests = boundedSetting('MODELOPS_PERFORMANCE_CREATE_REQUESTS', 8, 2, 8);
    const concurrency = boundedSetting('MODELOPS_PERFORMANCE_CONCURRENCY', 4, 1, 8);
    const stabilitySeconds = boundedSetting('MODELOPS_PERFORMANCE_STABILITY_SECONDS', 15, 10, 300);
    const readsPerSecond = boundedSetting('MODELOPS_PERFORMANCE_READS_PER_SECOND', 2, 1, 10);
    const measurements: Measurement[] = [];
    await authenticate(page, fixture!);

    const created = await runBounded(createRequests, concurrency, async (index) => {
      const result = await measured('create', () => page.request.post('/api/modelops', {
        headers: { 'Idempotency-Key': crypto.randomUUID() },
        data: {
          model_name: `Performance fixture ${index}`,
          version: `1.0.${index}`,
          dataset: 'disposable-performance-benchmark',
          intended_use: 'Bounded authenticated performance validation using disposable non-sensitive data.',
          data_classification: 'public',
          uses_sensitive_data: false,
        },
      }));
      measurements.push(result.measurement);
      await expectSuccessful(result.response);
      expect(result.measurement.request_id).toBeTruthy();
      return result.response.json() as Promise<{ record_id: string }>;
    });

    const comparison = await measured('compare', () => page.request.post('/api/modelops/compare', {
      data: { baseline_id: created[0].record_id, candidate_id: created[1].record_id },
    }));
    measurements.push(comparison.measurement);
    await expectSuccessful(comparison.response);
    expect(comparison.measurement.request_id).toBeTruthy();

    const reviewRecords = Math.min(2, created.length);
    await runBounded(reviewRecords, concurrency, async (index) => {
      for (const action of ['submitted', 'under_review', 'rejected'] as const) {
        const review = await measured(`review.${action}`, () => page.request.post(`/api/modelops/${created[index].record_id}/review`, {
          headers: { 'Idempotency-Key': crypto.randomUUID() },
          data: {
            action,
            reason: `Bounded performance validation: ${action}.`,
            policy_id: 'enterprise_general',
          },
        }));
        measurements.push(review.measurement);
        await expectSuccessful(review.response);
        expect(review.measurement.request_id).toBeTruthy();
        expect((await review.response.json()).workflow_state).toBe(action);
      }
    });

    const stabilityDeadline = Date.now() + stabilitySeconds * 1_000;
    while (Date.now() < stabilityDeadline) {
      const tickStarted = Date.now();
      const reads = await Promise.all(Array.from({ length: readsPerSecond }, () => measured('list', () => page.request.get('/api/modelops?limit=20'))));
      for (const read of reads) {
        measurements.push(read.measurement);
        await expectSuccessful(read.response);
        expect(read.measurement.request_id).toBeTruthy();
      }
      const remaining = 1_000 - (Date.now() - tickStarted);
      if (remaining > 0) await new Promise((resolve) => setTimeout(resolve, remaining));
    }

    const baseline = {
      generated_at: new Date().toISOString(),
      workload: { create_requests: createRequests, review_records: reviewRecords, concurrency, stability_seconds: stabilitySeconds, reads_per_second: readsPerSecond },
      results: summarize(measurements),
    };
    const artifactPath = testInfo.outputPath('authenticated-performance-baseline.json');
    await writeFile(artifactPath, `${JSON.stringify(baseline, null, 2)}\n`, 'utf8');
    await testInfo.attach('authenticated-performance-baseline', { path: artifactPath, contentType: 'application/json' });
    console.log(`PERFORMANCE_BASELINE ${JSON.stringify(baseline)}`);
  });
});
