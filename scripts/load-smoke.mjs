#!/usr/bin/env node
import { fileURLToPath, pathToFileURL } from 'node:url';

const LIMITS = Object.freeze({ maxRequests: 500, maxConcurrency: 50, maxTimeoutMs: 30_000 });

export function percentile(values, rank) {
  if (values.length === 0) return null;
  const ordered = [...values].sort((left, right) => left - right);
  return ordered[Math.ceil((rank / 100) * ordered.length) - 1];
}

function boundedInteger(value, name, fallback, maximum) {
  const candidate = value === undefined ? fallback : Number(value);
  if (!Number.isInteger(candidate) || candidate < 1 || candidate > maximum) {
    throw new Error(`${name} must be an integer between 1 and ${maximum}.`);
  }
  return candidate;
}

export function parseArguments(argv) {
  const options = { requests: 100, concurrency: 10, timeoutMs: 10_000 };
  let url;
  for (let index = 0; index < argv.length; index += 1) {
    const item = argv[index];
    if (item === '--requests') options.requests = boundedInteger(argv[++index], '--requests', 100, LIMITS.maxRequests);
    else if (item === '--concurrency') options.concurrency = boundedInteger(argv[++index], '--concurrency', 10, LIMITS.maxConcurrency);
    else if (item === '--timeout-ms') options.timeoutMs = boundedInteger(argv[++index], '--timeout-ms', 10_000, LIMITS.maxTimeoutMs);
    else if (!url) url = item;
    else throw new Error(`Unexpected argument: ${item}`);
  }
  if (!url) throw new Error('A deployment URL is required.');
  const parsed = new URL(url);
  const isLocal = ['localhost', '127.0.0.1', '::1'].includes(parsed.hostname);
  if (parsed.protocol !== 'https:' && !(parsed.protocol === 'http:' && isLocal)) throw new Error('Use HTTPS, except when probing localhost.');
  if (parsed.pathname !== '/' || parsed.search || parsed.hash || parsed.username || parsed.password) {
    throw new Error('Provide an origin only, without a path, query, credentials, or fragment.');
  }
  options.concurrency = Math.min(options.concurrency, options.requests);
  return { url: new URL('/api/health', parsed).toString(), ...options };
}

export function summarize(results) {
  const latencies = results.filter((result) => result.durationMs !== null).map((result) => result.durationMs);
  const statuses = {};
  for (const result of results) {
    const key = result.status === null ? 'transport_error' : String(result.status);
    statuses[key] = (statuses[key] ?? 0) + 1;
  }
  return {
    requests: results.length,
    statuses,
    transportErrors: results.filter((result) => result.status === null).length,
    serverErrors: results.filter((result) => result.status !== null && result.status >= 500).length,
    unhealthyResponses: results.filter((result) => result.status === 200 && result.healthy === false).length,
    missingRequestIds: results.filter((result) => result.status !== null && !result.requestId).length,
    latencyMs: { p50: percentile(latencies, 50), p95: percentile(latencies, 95), p99: percentile(latencies, 99), max: latencies.length ? Math.max(...latencies) : null },
  };
}

async function probe(url, timeoutMs) {
  const startedAt = performance.now();
  try {
    const response = await fetch(url, { cache: 'no-store', redirect: 'manual', signal: AbortSignal.timeout(timeoutMs) });
    const durationMs = Math.round(performance.now() - startedAt);
    let healthy = false;
    if (response.status === 200) {
      try {
        const body = await response.json();
        healthy = body?.status === 'ok' && body?.checks?.database === 'ok';
      } catch { healthy = false; }
    }
    return { status: response.status, healthy, requestId: response.headers.get('x-request-id'), durationMs };
  } catch (error) {
    return { status: null, healthy: false, requestId: null, durationMs: null, error: error instanceof Error ? error.name : 'UnknownError' };
  }
}

export async function runControlledProbe(options) {
  const results = new Array(options.requests);
  let nextIndex = 0;
  async function worker() {
    while (nextIndex < options.requests) {
      const index = nextIndex++;
      results[index] = await probe(options.url, options.timeoutMs);
    }
  }
  await Promise.all(Array.from({ length: options.concurrency }, () => worker()));
  return summarize(results);
}

async function main() {
  try {
    const options = parseArguments(process.argv.slice(2));
    console.log(`Controlled readiness probe: ${options.requests} requests, concurrency ${options.concurrency}`);
    const summary = await runControlledProbe(options);
    console.log(JSON.stringify(summary, null, 2));
    const failed = summary.transportErrors > 0 || summary.serverErrors > 0 || summary.unhealthyResponses > 0 || summary.missingRequestIds > 0 || summary.statuses['200'] !== summary.requests;
    if (failed) {
      console.error('FAIL  The controlled readiness probe detected an availability or response-integrity failure.');
      process.exitCode = 1;
    } else console.log('PASS  Every controlled request returned healthy HTTP 200 with a request ID.');
  } catch (error) {
    console.error(`Usage: node scripts/load-smoke.mjs <origin> [--requests 100] [--concurrency 10] [--timeout-ms 10000]\n${error instanceof Error ? error.message : error}`);
    process.exitCode = 2;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(fileURLToPath(pathToFileURL(process.argv[1]))).href) await main();
