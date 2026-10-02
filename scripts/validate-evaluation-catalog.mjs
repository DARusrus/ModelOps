import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Exercise the real catalog, filters and role context. HTTP intentionally ignores
// cancellation: late success/error handlers must still protect the current view.
const repository = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(path.join(repository, 'package.json'));
const { build } = require('esbuild');
const { chromium, expect } = require('@playwright/test');
const mocks = {
  'next/link': "import React from 'react'; export default function Link(props) { return React.createElement('a', props); }",
  'next/navigation': `import React from 'react';
    export const Routing = React.createContext('');
    export function useSearchParams() { return new URLSearchParams(React.useContext(Routing)); }
    export function useRouter() { return { push: (url) => window.catalog.route(url) }; }`,
  '@/lib/client/api': `export class ApiClientError extends Error {}
    export function isAbortError(error) { return error?.name === 'AbortError'; }
    export function requestJson(url, options = {}) {
      return new Promise((resolve, reject) => window.catalog.requests.push({ url, resolve, reject, signal: options.signal }));
    }`,
};
const bundle = await build({
  stdin: {
    contents: `import React, { useState } from 'react';
      import { createRoot } from 'react-dom/client';
      import { Routing } from 'next/navigation';
      import EvaluationCatalog from './src/components/evaluations/EvaluationCatalog';
      import { WorkspaceAccessProvider } from './src/components/app-shell/WorkspaceAccessContext';
      window.catalog = { requests: [] };
      function Harness() {
        const [query, setQuery] = useState('');
        const [role, setRole] = useState('admin');
        const [visible, setVisible] = useState(true);
        window.catalog.route = (url) => { history.replaceState({}, '', url); setQuery(new URL(url, location.href).searchParams.toString()); };
        window.catalog.setRole = setRole;
        window.catalog.unmount = () => setVisible(false);
        return <Routing.Provider value={query}><WorkspaceAccessProvider role={role}>{visible && <EvaluationCatalog />}</WorkspaceAccessProvider></Routing.Provider>;
      }
      createRoot(document.getElementById('root')).render(<Harness />);`,
    resolveDir: repository, loader: 'tsx',
  },
  bundle: true, write: false, platform: 'browser', jsx: 'automatic',
  define: { 'process.env.NODE_ENV': '"production"' },
  plugins: [{ name: 'catalog-boundaries', setup(builder) {
    builder.onResolve({ filter: /^(next\/link|next\/navigation|@\/lib\/client\/api)$/ }, ({ path }) => ({ path, namespace: 'controlled' }));
    builder.onLoad({ filter: /.*/, namespace: 'controlled' }, ({ path }) => ({ contents: mocks[path], resolveDir: repository }));
  } }],
});
const browser = await chromium.launch();
const checks = [];
const body = (names, cursor = null) => ({ success: true, evaluations: names.map((name) => ({
  id: name, model_name: name, version: '1', readiness_score: 25, workflow_state: 'draft',
  created_at: '2026-10-02T00:00:00Z', expires_at: '2027-10-02T00:00:00Z',
})), next_cursor: cursor, has_more: Boolean(cursor), page_size: 20 });
async function start() {
  const page = await browser.newPage();
  await page.route('**/*', (route) => route.fulfill({ contentType: 'text/html', body: '<!doctype html><div id="root"></div>' }));
  await page.goto('http://catalog-regression.test/evaluations');
  await page.addScriptTag({ content: bundle.outputFiles[0].text });
  await count(page, 1);
  return page;
}
async function count(page, expected) { await page.waitForFunction((n) => window.catalog.requests.length === n, expected); }
async function resolve(page, index, response) {
  await page.evaluate(({ index, response }) => window.catalog.requests[index].resolve(response), { index, response });
}
async function reject(page, index) { await page.evaluate((i) => window.catalog.requests[i].reject(new Error('Controlled failure')), index); }
async function route(page, query) { await page.evaluate((q) => window.catalog.route(`/evaluations?${q}`), query); }
async function rows(page, names) {
  await expect(page.getByRole('table', { name: 'Evaluation catalog' }).locator('tbody tr')).toHaveCount(names.length);
  await expect(page.getByRole('table', { name: 'Evaluation catalog' }).locator('tbody tr td:first-child span:first-child')).toHaveText(names);
}
try {
  const page = await start();
  await resolve(page, 0, body(['Initial'], 'old-cursor'));
  await rows(page, ['Initial']);
  await page.getByRole('button', { name: 'Load more', exact: true }).click();
  await count(page, 2);
  await route(page, 'q=new&sort=oldest');
  await count(page, 3);
  assert.equal(await page.evaluate(() => window.catalog.requests[1].signal.aborted), true);
  await resolve(page, 2, body(['New'], 'new-cursor'));
  await rows(page, ['New']);
  await page.getByRole('button', { name: 'Load more', exact: true }).click();
  await count(page, 4);
  assert.equal(await page.evaluate(() => new URL(window.catalog.requests[3].url, location.href).searchParams.get('cursor')), 'new-cursor');
  await resolve(page, 1, body(['Old late'], 'wrong-cursor'));
  await rows(page, ['New']);
  await expect(page.getByRole('button', { name: 'Load more', exact: true })).toBeDisabled();
  checks.push('Late old-filter pagination cannot append records or replace the current cursor');

  await reject(page, 3);
  await expect(page.getByRole('alert')).toBeVisible();
  await rows(page, ['New']);
  await expect(page.getByRole('button', { name: 'Load more', exact: true })).toBeEnabled();
  await page.getByRole('button', { name: 'Load more', exact: true }).click();
  await count(page, 5);
  await resolve(page, 4, body(['New', 'Second', 'Second', 'Third']));
  await rows(page, ['New', 'Second', 'Third']);
  await expect(page.getByRole('alert')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Load more', exact: true })).toHaveCount(0);
  checks.push('Page failure retains rows and releases pending; retry deduplicates within/across pages and terminates pagination');

  await route(page, 'q=failed&state=draft');
  await count(page, 6);
  await reject(page, 5);
  await expect(page.getByRole('alert')).toBeVisible();
  await expect(page.getByRole('table')).toHaveCount(0);
  await expect(page.getByText('No matching evaluations', { exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: 'Retry', exact: true }).focus();
  await page.keyboard.press('Enter');
  await count(page, 7);
  assert.equal(await page.evaluate(() => window.catalog.requests[6].url), '/api/modelops?q=failed&state=draft&limit=20');
  await expect(page.getByRole('status')).toBeVisible();
  await resolve(page, 6, body([]));
  await expect(page.getByText('No matching evaluations', { exact: true })).toBeVisible();
  await expect(page.getByRole('alert')).toHaveCount(0);
  checks.push('Failed replacement hides stale rows, distinguishes failure from empty, and supports keyboard retry with unchanged filters');

  await route(page, 'q=A'); await count(page, 8);
  await route(page, 'q=B'); await count(page, 9);
  await route(page, 'q=A'); await count(page, 10);
  await resolve(page, 9, body(['Current A'])); await rows(page, ['Current A']);
  await resolve(page, 7, body(['Obsolete A']));
  await reject(page, 8);
  await rows(page, ['Current A']);
  await expect(page.getByRole('alert')).toHaveCount(0);
  checks.push('Out-of-order success/error and A-B-A navigation cannot replace the active lifecycle');

  await page.evaluate(() => window.catalog.setRole('viewer'));
  await expect(page.getByRole('link', { name: 'Compare records' })).toHaveCount(0);
  await expect(page.getByRole('link', { name: 'Open evaluation Current A 1' })).toHaveAttribute('href', '/evaluations/Current A');
  await page.getByLabel('Model name or version').fill('keyboard');
  await page.getByRole('button', { name: 'Apply filters', exact: true }).focus();
  await page.keyboard.press('Enter'); await count(page, 11);
  await resolve(page, 10, body(['Filtered'])); await rows(page, ['Filtered']);
  assert.match(page.url(), /q=keyboard/);
  checks.push('Real filters remain URL-based and keyboard-operable; viewer retains read access without comparison controls');

  await route(page, 'q=unmount'); await count(page, 12);
  await resolve(page, 11, body(['Unmount'], 'cursor'));
  await rows(page, ['Unmount']);
  await page.getByRole('button', { name: 'Load more', exact: true }).click(); await count(page, 13);
  await page.evaluate(() => window.catalog.unmount());
  await expect(page.getByRole('heading', { name: 'Persisted dossiers' })).toHaveCount(0);
  assert.equal(await page.evaluate(() => window.catalog.requests[11].signal.aborted && window.catalog.requests[12].signal.aborted), true);
  await resolve(page, 12, body(['Late unmounted']));
  await expect(page.getByRole('table')).toHaveCount(0);
  checks.push('Unmount aborts first-page and pagination lifecycles; late completion cannot recreate the view');
  await page.close();
} finally { await browser.close(); }
await mkdir(path.join(repository, 'test-results'), { recursive: true });
await writeFile(path.join(repository, 'test-results/evaluation-catalog-regression.json'), JSON.stringify({
  generated_at: new Date().toISOString(), scope: 'Real React components with controlled routing/HTTP; no credentials or database writes', checks,
}, null, 2) + '\n');
console.log('PASS ' + checks.join('\nPASS '));
