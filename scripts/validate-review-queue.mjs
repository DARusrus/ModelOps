import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Bundle the real component. Only Next routing and HTTP are controlled.
// Requests deliberately ignore abort to test late-response guards as well.
const repository = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(path.join(repository, 'package.json'));
const { build } = require('esbuild');
const { chromium, expect } = require('@playwright/test');
const mocks = {
  'next/link': "import React from 'react'; export default function Link(props) { return React.createElement('a', props); }",
  'next/navigation': "export function useRouter() { return { replace: (url) => window.queue.route(url) }; }",
  '@/lib/client/api': `export function isAbortError(error) { return error?.name === 'AbortError'; }
    export function requestJson(url, options = {}) {
      return new Promise((resolve, reject) => window.queue.requests.push({ url, resolve, reject, signal: options.signal }));
    }`,
};
const bundle = await build({
  stdin: {
    contents: `import React, { useState } from 'react';
      import { createRoot } from 'react-dom/client';
      import ReviewQueue from './src/components/reviews/ReviewQueue';
      window.queue = { requests: [] };
      function Harness() {
        const [filter, setFilter] = useState('all');
        window.queue.route = (url) => { history.replaceState({}, '', url); setFilter(new URL(url, location.href).searchParams.get('state') || 'all'); };
        return <ReviewQueue initialState={filter} />;
      }
      createRoot(document.getElementById('root')).render(<Harness />);`,
    resolveDir: repository, loader: 'tsx',
  },
  bundle: true, write: false, platform: 'browser', jsx: 'automatic',
  define: { 'process.env.NODE_ENV': '"production"' },
  plugins: [{
    name: 'queue-boundaries',
    setup(builder) {
      builder.onResolve({ filter: /^(next\/link|next\/navigation|@\/lib\/client\/api)$/ }, ({ path }) => ({ path, namespace: 'controlled' }));
      builder.onLoad({ filter: /.*/, namespace: 'controlled' }, ({ path }) => ({ contents: mocks[path], resolveDir: repository }));
    },
  }],
});
const browser = await chromium.launch();
const row = (name, state = 'submitted') => ({
  id: name, model_name: name, version: '1', readiness_score: 25,
  workflow_state: state, author_email: 'synthetic@example.test',
  created_at: '2026-10-02T00:00:00.510661Z', last_review_at: null,
});
const body = (names, cursor = null) => ({ success: true, reviews: names.map((name) => row(name)), next_cursor: cursor, has_more: Boolean(cursor), page_size: 20 });
const checks = [];
async function pageForTest() {
  const page = await browser.newPage();
  await page.route('**/*', (route) => route.fulfill({ contentType: 'text/html', body: '<!doctype html><div id="root"></div>' }));
  await page.goto('http://queue-regression.test/reviews');
  await page.addScriptTag({ content: bundle.outputFiles[0].text });
  await page.waitForFunction(() => window.queue.requests.length === 1);
  return page;
}
async function resolve(page, index, response) {
  await page.evaluate(({ index, response }) => window.queue.requests[index].resolve(response), { index, response });
}
try {
  const page = await pageForTest();
  await resolve(page, 0, body(['Original']));
  await expect(page.getByRole('heading', { name: 'Original', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'All pending', exact: true }).click();
  await expect(page.getByRole('status')).toHaveCount(0);
  assert.equal(await page.evaluate(() => window.queue.requests.length), 1);
  checks.push('Active filter is a no-op, with no stuck spinner');

  await page.getByRole('button', { name: 'Submitted', exact: true }).click();
  await page.waitForFunction(() => window.queue.requests.length === 2);
  await expect(page.getByRole('heading', { name: 'Original', exact: true })).toHaveCount(0);
  await page.evaluate(() => window.queue.requests[1].reject(new Error('Controlled filter failure')));
  await expect(page.getByRole('alert')).toContainText('Controlled filter failure');
  await expect(page.getByRole('status')).toHaveCount(0);
  await page.getByRole('button', { name: 'Retry', exact: true }).click();
  await page.waitForFunction(() => window.queue.requests.length === 3);
  await resolve(page, 2, body(['Submitted result'], 'cursor-one'));
  await expect(page.getByRole('heading', { name: 'Submitted result', exact: true })).toBeVisible();
  checks.push('Failed filter hides stale records; retry resolves loading and error');

  await page.getByRole('button', { name: 'Load more', exact: true }).click();
  await page.waitForFunction(() => window.queue.requests.length === 4);
  await page.getByRole('button', { name: 'Under review', exact: true }).click();
  await page.waitForFunction(() => window.queue.requests.length === 5);
  assert.equal(await page.evaluate(() => window.queue.requests[3].signal.aborted), true);
  await resolve(page, 4, body(['New filter']));
  await expect(page.getByRole('heading', { name: 'New filter', exact: true })).toBeVisible();
  await resolve(page, 3, body(['Late old page']));
  await expect(page.getByRole('heading', { name: 'Late old page', exact: true })).toHaveCount(0);
  checks.push('Filter change aborts pagination; late old-filter data cannot append');

  await page.evaluate(() => window.queue.route('/reviews?state=submitted'));
  await page.waitForFunction(() => window.queue.requests.length === 6);
  await expect(page.getByRole('button', { name: 'Submitted', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await resolve(page, 5, body(['Route-prop result'], 'cursor-two'));
  await expect(page.getByRole('heading', { name: 'Route-prop result', exact: true })).toBeVisible();
  checks.push('Route prop is authoritative without component remount');

  await page.getByRole('button', { name: 'Load more', exact: true }).click();
  await page.waitForFunction(() => window.queue.requests.length === 7);
  await page.evaluate(() => window.queue.requests[6].reject(new Error('Controlled page failure')));
  await expect(page.getByRole('alert')).toContainText('Controlled page failure');
  await expect(page.getByRole('button', { name: 'Load more', exact: true })).toBeEnabled();
  await page.getByRole('button', { name: 'Load more', exact: true }).click();
  await page.waitForFunction(() => window.queue.requests.length === 8);
  await resolve(page, 7, body(['Second page']));
  await expect(page.getByRole('heading', { name: 'Second page', exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Route-prop result', exact: true })).toBeVisible();
  await expect(page.getByRole('alert')).toHaveCount(0);
  checks.push('Pagination failure releases loading; successful retry appends current-filter rows');
  await page.close();
} finally {
  await browser.close();
}
await mkdir(path.join(repository, 'test-results'), { recursive: true });
await writeFile(path.join(repository, 'test-results/review-queue-regression.json'), JSON.stringify({
  generated_at: new Date().toISOString(), scope: 'Real React component, controlled routing and HTTP; no Supabase or credentials', checks,
}, null, 2) + '\n');
console.log('PASS ' + checks.join('\nPASS '));
