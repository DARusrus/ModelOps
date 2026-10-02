import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { chromium, expect } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repository = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
// Real fetch wrapper, SSR auth client and button; only HTTP and Next navigation
// are controlled. No credentials, Supabase project or live requests are used.
const bundle = await build({
  stdin: {
    contents: `import React from 'react';
      import { createRoot } from 'react-dom/client';
      import { createTimeoutFetch } from './src/lib/network/timeout';
      import { createSupabaseBrowserClient } from './src/lib/supabase/client';
      import SignOutButton from './src/components/auth/SignOutButton';
      window.authRegression = { fetch: createTimeoutFetch(1000), client: createSupabaseBrowserClient() };
      createRoot(document.getElementById('root')).render(<SignOutButton />);`,
    resolveDir: repository, loader: 'tsx',
  },
  bundle: true, write: false, platform: 'browser', jsx: 'automatic',
  define: {
    'process.env.NODE_ENV': '"production"',
    'process.env.NEXT_PUBLIC_SUPABASE_URL': '"http://auth-regression.test"',
    'process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY': '"sb_publishable_synthetic_test_only"',
  },
  plugins: [{
    name: 'controlled-next-navigation',
    setup(builder) {
      builder.onResolve({ filter: /^next\/navigation$/ }, () => ({ path: 'navigation', namespace: 'controlled' }));
      builder.onLoad({ filter: /.*/, namespace: 'controlled' }, () => ({
        contents: `export function useRouter() { return {
          replace: (url) => history.replaceState({}, '', url), refresh: () => {},
        }; }`,
      }));
    },
  }],
});
const browser = await chromium.launch();
const checks = [];
try {
  const page = await browser.newPage();
  let rejectLogout = true;
  await page.route('**/*', async (route) => {
    const url = new URL(route.request().url());
    if (url.pathname === '/auth/v1/token') {
      const payload = { sub: '00000000-0000-4000-8000-000000000001', exp: Math.floor(Date.now() / 1000) + 3600 };
      const token = [Buffer.from('{"alg":"HS256"}').toString('base64url'), Buffer.from(JSON.stringify(payload)).toString('base64url'), 'synthetic'].join('.');
      return route.fulfill({ json: {
        access_token: token, refresh_token: 'synthetic-refresh-token', expires_in: 3600, token_type: 'bearer',
        user: { id: payload.sub, aud: 'authenticated', role: 'authenticated', email: 'synthetic@example.test' },
      } });
    }
    if (url.pathname === '/auth/v1/logout') return rejectLogout
      ? route.fulfill({ status: 500, json: { message: 'Synthetic logout failure' } })
      : route.fulfill({ status: 204 });
    if (url.pathname.startsWith('/empty/')) return route.fulfill({ status: Number(url.pathname.split('/').pop()) });
    if (url.pathname === '/json') return route.fulfill({ status: 201, json: { ok: true }, headers: { 'x-request-id': 'synthetic-request' } });
    return route.fulfill({ contentType: 'text/html', body: '<!doctype html><div id="root"></div>' });
  });
  await page.goto('http://auth-regression.test/evaluations');
  await page.addScriptTag({ content: bundle.outputFiles[0].text });
  for (const status of [204, 205, 304]) {
    const result = await page.evaluate(async (status) => {
      const response = await window.authRegression.fetch('/empty/' + status);
      return { status: response.status, text: await response.text() };
    }, status);
    assert.deepEqual(result, { status, text: '' });
    checks.push('Native Chromium HTTP ' + status + ' is preserved without an invalid response body');
  }
  const json = await page.evaluate(async () => {
    const response = await window.authRegression.fetch('/json');
    return { status: response.status, id: response.headers.get('x-request-id'), json: await response.clone().json(), original: await response.json() };
  });
  assert.deepEqual(json, { status: 201, id: 'synthetic-request', json: { ok: true }, original: { ok: true } });
  checks.push('Native Chromium JSON status, headers and cloning remain intact');

  async function signIn() {
    const result = await page.evaluate(async () => {
      const { error } = await window.authRegression.client.auth.signInWithPassword({ email: 'synthetic@example.test', password: 'synthetic-test-only' });
      return { error: error?.message ?? null, cookiesPresent: document.cookie.includes('-auth-token') };
    });
    assert.deepEqual(result, { error: null, cookiesPresent: true });
  }
  await signIn();
  await page.getByRole('button', { name: 'Sign out', exact: true }).click();
  await expect(page.getByRole('alert')).toHaveText('Sign out could not be completed. Please try again.');
  await expect(page.getByRole('button', { name: 'Sign out', exact: true })).toBeEnabled();
  await expect(page).toHaveURL('http://auth-regression.test/evaluations');
  // The installed auth SDK clears local credentials even when remote logout
  // fails. Preserve that policy; the component must not hide the remote error.
  assert.equal(await page.evaluate(() => document.cookie.includes('-auth-token')), false);
  checks.push('A genuine logout failure remains visible and retryable without false success navigation');
  rejectLogout = false;
  await signIn();
  await page.getByRole('button', { name: 'Sign out', exact: true }).click();
  await expect(page).toHaveURL('http://auth-regression.test/login');
  assert.equal(await page.evaluate(() => document.cookie.includes('-auth-token')), false);
  await expect(page.getByRole('alert')).toHaveCount(0);
  checks.push('Real SSR auth client and sign-out button accept HTTP 204, clear auth cookies and request login navigation');
} finally {
  await browser.close();
}
await mkdir(path.join(repository, 'test-results'), { recursive: true });
await writeFile(path.join(repository, 'test-results/browser-auth-regression.json'), JSON.stringify({
  generated_at: new Date().toISOString(), scope: 'Native Chromium and real Supabase SSR client/component; controlled HTTP and Next navigation; no live credentials', checks,
}, null, 2) + '\n');
console.log('PASS ' + checks.join('\nPASS '));
