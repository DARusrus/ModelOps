import { expect, type Page } from '@playwright/test';
import type { BrowserFixture } from './fixtures';

export async function signInBrowserUser(
  page: Page,
  user: BrowserFixture['user'],
  expectedPath: RegExp,
) {
  await page.getByLabel('Email').fill(user.email);
  await page.getByLabel('Password', { exact: true }).fill(user.password);
  const tokenResponse = page.waitForResponse((response) => {
    const url = new URL(response.url());
    return response.request().method() === 'POST'
      && url.pathname === '/auth/v1/token'
      && url.searchParams.get('grant_type') === 'password';
  });
  await page.getByRole('button', { name: 'Sign in' }).click();
  expect((await tokenResponse).status(), 'Supabase password authentication must succeed').toBe(200);
  await expect(page).toHaveURL(expectedPath, { timeout: 30_000 });
}

export async function signOutBrowserUser(page: Page) {
  const logoutResponse = page.waitForResponse((response) => {
    const url = new URL(response.url());
    return response.request().method() === 'POST' && url.pathname === '/auth/v1/logout';
  });
  await page.getByLabel('Open account menu').click();
  await page.getByRole('button', { name: 'Sign out' }).click();
  const response = await logoutResponse;
  expect(response.ok(), `Supabase sign-out must succeed (HTTP ${response.status()})`).toBe(true);
  await expect(page).toHaveURL(/\/login$/, { timeout: 30_000 });

  const authCookies = (await page.context().cookies())
    .filter((cookie) => cookie.name.includes('-auth-token'));
  expect(authCookies, 'Supabase authentication cookies must be cleared after sign-out').toEqual([]);
}
