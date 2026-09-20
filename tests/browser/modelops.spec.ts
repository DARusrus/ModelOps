import { expect, test } from '@playwright/test';
import axe from 'axe-core';
import { readFile } from 'node:fs/promises';
import { createBrowserFixture, removeBrowserFixture, type BrowserFixture } from './fixtures';

const enabled = process.env.RUN_MODELOPS_BROWSER_E2E === 'true';

const browserDescribe = enabled ? test.describe : test.describe.skip;

async function scanSeriousAndCriticalViolations(page: import('@playwright/test').Page) {
  await page.addScriptTag({ content: axe.source });
  return page.evaluate(async () => {
    const axeOnPage = (window as unknown as Window & { axe: typeof axe }).axe;
    const result = await axeOnPage.run();
    return result.violations
      .filter((violation) => ['serious', 'critical'].includes(violation.impact || ''))
      .flatMap((violation) => violation.nodes.map((node) => ({
        id: violation.id,
        target: node.target,
        summary: node.failureSummary,
      })));
  });
}

async function signIn(
  page: import('@playwright/test').Page,
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

async function signOut(page: import('@playwright/test').Page) {
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

browserDescribe('ModelOps browser workflow (requires the disposable Supabase runner)', () => {
  let fixture: BrowserFixture | undefined;

  test.describe.configure({ timeout: 90_000 });

  test.beforeAll(async () => { fixture = await createBrowserFixture(); });
  test.afterAll(async () => { await removeBrowserFixture(fixture); });

  test('requires sign-in, saves evaluations, exports a rejected dossier, and compares authorized records', async ({ page }, testInfo) => {
    // This is intentionally a full cross-service journey (Auth, persistence,
    // review transitions, and comparison), so allow normal remote CI variance.
    test.slow();
    await page.goto('/modelops');
    await expect(page).toHaveURL(/\/login(?:\?|$)/);
    await signIn(page, fixture!.user, /\/modelops$/);
    await page.getByRole('button', { name: 'Blank template' }).click();
    await page.getByLabel('Model name').fill('Browser validated model');
    await page.getByLabel('Version').fill('1.0.0');
    await page.getByTitle('Jump to Intended use').click();
    await page.getByLabel('Primary intended uses').fill('Validate the protected browser workflow using only disposable test data.');
    await page.getByTitle('Jump to Evaluation data').click();
    await page.getByLabel('Evaluation benchmark dataset').fill('browser-e2e-benchmark');
    await page.getByRole('button', { name: 'Generate Model Card' }).click();
    await expect(page.getByRole('heading', { level: 2, name: /^Browser validated model v1\.0\.0$/ })).toBeVisible();
    await page.getByRole('button', { name: /What-If/ }).click();
    await expect(page.getByRole('heading', { name: /What Would It Take/ })).toBeVisible();
    await page.getByRole('button', { name: 'Simulate All Fixes' }).click();
    await expect(page.getByText('Re-evaluate after evidence is supplied')).toBeVisible();
    await page.getByRole('button', { name: 'Policy & Audit Trail' }).click();
    await expect(page.getByRole('region', { name: 'Review attestation' })).toBeVisible();
    await page.getByLabel('Reason for this workflow action').fill('Browser workflow validation submission.');
    await page.getByRole('button', { name: 'submitted' }).click();
    await expect(page.getByText('Persisted review history')).toBeVisible();
    await expect(page.getByText('Browser workflow validation submission.')).toBeVisible();
    await page.getByLabel('Reason for this workflow action').fill('Browser workflow validation review.');
    await expect(page.getByLabel('Reason for this workflow action')).toHaveValue('Browser workflow validation review.');
    await page.getByRole('button', { name: 'under review' }).click();
    await expect(page.getByText('Browser workflow validation review.')).toBeVisible();
    await expect(page.getByRole('button', { name: 'rejected' })).toBeVisible();
    await page.getByLabel('Reason for this workflow action').fill('Browser workflow validation rejection.');
    await expect(page.getByLabel('Reason for this workflow action')).toHaveValue('Browser workflow validation rejection.');
    await page.getByRole('button', { name: 'rejected' }).click();
    await expect(page.getByText('Browser workflow validation rejection.')).toBeVisible();

    // The action has an explicit accessible name that describes the panel it
    // controls; use that contract instead of its visual label.
    await page.getByRole('button', { name: 'Toggle Export Governance Report Panel' }).click();
    await expect(page.getByRole('region', { name: 'Export Governance Model Card Report' })).toBeVisible();
    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Download JSON Dossier' }).click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/^model-card-[0-9a-f-]+\.json$/i);
    const dossierPath = testInfo.outputPath('rejected-model-card-dossier.json');
    await download.saveAs(dossierPath);
    const dossier = JSON.parse(await readFile(dossierPath, 'utf8')) as {
      schema_version: string;
      model_card: { workflow_state: string };
      review_history: Array<{ action: string; reason: string }>;
    };
    expect(dossier.schema_version).toBe('modelops-governance-export/1');
    expect(dossier.model_card.workflow_state).toBe('rejected');
    expect(dossier.review_history.map((event) => event.action)).toEqual(['submitted', 'under_review', 'rejected']);
    expect(dossier.review_history.at(-1)?.reason).toBe('Browser workflow validation rejection.');

    // Comparisons accept persisted IDs only. Create a second saved card so the
    // UI exercises the authorized server-side lookup rather than client JSON.
    await page.getByRole('button', { name: 'Start New Model Evaluation' }).click();
    await page.getByRole('button', { name: 'Blank template' }).click();
    await page.getByLabel('Model name').fill('Browser comparison candidate');
    await page.getByLabel('Version').fill('1.0.1');
    await page.getByTitle('Jump to Intended use').click();
    await page.getByLabel('Primary intended uses').fill('Validate persisted, organization-authorized model comparison.');
    await page.getByTitle('Jump to Evaluation data').click();
    await page.getByLabel('Evaluation benchmark dataset').fill('browser-comparison-benchmark');
    await page.getByRole('button', { name: 'Generate Model Card' }).click();
    await expect(page.getByRole('heading', { level: 2, name: /^Browser comparison candidate v1\.0\.1$/ })).toBeVisible();

    // Persisted records must remain discoverable and reopenable after leaving
    // their result view; this is organization history, not browser memory.
    await page.getByRole('button', { name: 'Start New Model Evaluation' }).click();
    await page.getByRole('button', { name: 'History', exact: true }).click();
    await page.getByRole('button', { name: 'Refresh', exact: true }).click();
    const savedEvaluations = page.getByRole('table', { name: 'Saved evaluations' });
    await expect(savedEvaluations).toBeVisible();
    await savedEvaluations.getByRole('button', { name: 'Open evaluation Browser validated model 1.0.0' }).click();
    await expect(page.getByRole('heading', { level: 2, name: /^Browser validated model v1\.0\.0$/ })).toBeVisible();
    await page.getByRole('button', { name: 'Policy & Audit Trail' }).click();
    await expect(page.getByText('Browser workflow validation rejection.')).toBeVisible();

    await page.getByRole('button', { name: 'Start New Model Evaluation' }).click();
    await page.getByRole('button', { name: 'History', exact: true }).click();
    await savedEvaluations.getByRole('button', { name: 'Open evaluation Browser comparison candidate 1.0.1' }).click();
    await expect(page.getByRole('heading', { level: 2, name: /^Browser comparison candidate v1\.0\.1$/ })).toBeVisible();
    await page.getByRole('button', { name: 'Run Comparison Diff' }).click();
    await expect(page.getByRole('region', { name: 'Authorized model comparison' })).toBeVisible();
    // The only saved baseline is selected by default. Resetting to the placeholder
    // first makes the subsequent selection a real user change and dispatches the
    // authorized comparison request.
    await page.getByLabel('Saved baseline').selectOption('');
    await page.getByLabel('Saved baseline').selectOption({ index: 1 });
    await expect(page.getByRole('table', { name: 'Comparison metrics' })).toBeVisible();
  });

  test('has no serious or critical automated accessibility violations on sign-in and the protected landing page', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByRole('link', { name: 'Create an account' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Forgot password?' })).toBeVisible();
    expect(await scanSeriousAndCriticalViolations(page)).toEqual([]);
    await signIn(page, fixture!.user, /\/modelops$/);
    expect(await scanSeriousAndCriticalViolations(page)).toEqual([]);
  });

  test('creates, filters, reopens, and refreshes a permanent evaluation route', async ({ page }) => {
    test.slow();
    const modelName = `Permanent route model ${crypto.randomUUID()}`;
    await page.goto('/login');
    await signIn(page, fixture!.user, /\/modelops$/);
    await page.getByRole('navigation', { name: 'Workspace navigation' }).getByRole('link', { name: /^Evaluations/ }).click();
    await expect(page).toHaveURL(/\/evaluations$/);
    await page.getByRole('link', { name: 'New evaluation' }).click();
    await expect(page).toHaveURL(/\/evaluations\/new$/);
    await page.getByRole('button', { name: 'Blank template' }).click();
    await page.getByLabel('Model name').fill(modelName);
    await page.getByLabel('Version').fill('2.0.0');
    await page.getByTitle('Jump to Intended use').click();
    await page.getByLabel('Primary intended uses').fill('Validate permanent evaluation routing with disposable browser data.');
    await page.getByTitle('Jump to Evaluation data').click();
    await page.getByLabel('Evaluation benchmark dataset').fill('permanent-route-browser-benchmark');
    await page.getByRole('button', { name: 'Generate Model Card' }).click();
    await expect(page).toHaveURL(/\/evaluations\/[0-9a-f-]{36}$/i, { timeout: 30_000 });
    const permanentEvaluationPath = new URL(page.url()).pathname;
    await expect(page.getByRole('heading', { level: 2, name: new RegExp(`^${modelName} v2\\.0\\.0$`) })).toBeVisible();

    await page.getByRole('button', { name: 'Policy & Audit Trail' }).click();
    await expect(page).toHaveURL(/\?tab=policy$/);
    await page.reload();
    await expect(page.getByRole('region', { name: 'Review attestation' })).toBeVisible();

    await page.getByRole('link', { name: 'Back to evaluations' }).click();
    await page.getByLabel('Model name or version').fill(modelName);
    await page.getByRole('button', { name: 'Apply filters' }).click();
    await expect(page).toHaveURL(/\/evaluations\?q=/);
    const catalog = page.getByRole('table', { name: 'Evaluation catalog' });
    await expect(catalog.getByText(modelName, { exact: true })).toBeVisible();
    await catalog.getByRole('link', { name: `Open evaluation ${modelName} 2.0.0` }).click();
    await page.getByRole('button', { name: /What-If/ }).click();
    await expect(page).toHaveURL(/\?tab=simulator$/);
    await page.goBack();
    await expect(page).toHaveURL(/\/evaluations\?q=/);
    await expect(page.getByLabel('Model name or version')).toHaveValue(modelName);
    expect(await scanSeriousAndCriticalViolations(page)).toEqual([]);

    await signOut(page);
    await signIn(page, fixture!.user, /\/modelops$/);
    await page.goto(permanentEvaluationPath);
    await expect(page.getByRole('heading', { level: 2, name: new RegExp(`^${modelName} v2\\.0\\.0$`) })).toBeVisible();
  });

  test('keeps protected navigation URL-based, refresh-safe, and role-aware', async ({ page }) => {
    await page.goto('/login');
    await signIn(page, fixture!.user, /\/modelops$/);

    const workspaceNavigation = page.getByRole('navigation', { name: 'Workspace navigation' });
    await workspaceNavigation.getByRole('link', { name: /^Evaluations/ }).click();
    await expect(page).toHaveURL(/\/evaluations$/);
    await expect(workspaceNavigation.getByRole('link', { name: /^Evaluations/ })).toHaveAttribute('aria-current', 'page');
    await workspaceNavigation.getByRole('link', { name: /^Team/ }).click();
    await expect(page).toHaveURL(/\/settings\/members$/);
    await expect(workspaceNavigation.getByRole('link', { name: /^Team/ })).toHaveAttribute('aria-current', 'page');

    await page.reload();
    await expect(page.getByRole('heading', { name: 'Members and invitations' })).toBeVisible();

    // Build a fresh client-navigation history after the reload. Next.js may
    // reconstruct its internal history entry while hydrating a reloaded page;
    // link-created entries are the behavior users rely on for back/forward.
    await workspaceNavigation.getByRole('link', { name: /^Evaluations/ }).click();
    await expect(page).toHaveURL(/\/evaluations$/);
    await workspaceNavigation.getByRole('link', { name: /^Team/ }).click();
    await expect(page).toHaveURL(/\/settings\/members$/);
    await page.goBack();
    await expect(page).toHaveURL(/\/evaluations$/);
    await expect(workspaceNavigation.getByRole('link', { name: /^Evaluations/ })).toHaveAttribute('aria-current', 'page');
    await page.goForward();
    await expect(page).toHaveURL(/\/settings\/members$/);
  });

  test('keeps mobile navigation keyboard-operable without horizontal overflow', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/login');
    await signIn(page, fixture!.user, /\/modelops$/);

    const trigger = page.getByRole('button', { name: 'Open workspace navigation' });
    await trigger.click();
    const dialog = page.getByRole('dialog', { name: 'Workspace navigation' });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole('link', { name: /^Evaluations/ })).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();
    await expect(trigger).toBeFocused();

    const hasHorizontalOverflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
    expect(hasHorizontalOverflow).toBe(false);
    expect(await scanSeriousAndCriticalViolations(page)).toEqual([]);

    await trigger.click();
    await dialog.getByRole('link', { name: /^Team/ }).click();
    await expect(page).toHaveURL(/\/settings\/members$/);
    await expect(dialog).toBeHidden();
  });

  test('onboards a confirmed user into one initial organization', async ({ page }) => {
    await page.goto('/login?next=%2Fonboarding');
    await signIn(page, fixture!.onboardingUser, /\/onboarding$/);
    await page.getByLabel('Workspace name').fill('Browser onboarding workspace');
    await page.getByRole('button', { name: 'Create workspace' }).click();
    await expect(page).toHaveURL(/\/modelops$/);
    await expect(page.getByRole('heading', { name: 'Model card generator' })).toBeVisible();
    await page.reload();
    await expect(page).toHaveURL(/\/modelops$/);
  });

  test('accepts an invitation and lets an administrator change and remove the member', async ({ page }) => {
    test.slow();
    await page.goto('/login');
    await signIn(page, fixture!.user, /\/modelops$/);
    await page.goto('/settings/members');
    await expect(page.getByRole('heading', { name: 'Members and invitations' })).toBeVisible();
    expect(await scanSeriousAndCriticalViolations(page)).toEqual([]);
    await page.getByLabel('Email address').fill(fixture!.invitedUser.email);
    await page.getByLabel('Initial role').selectOption('reviewer');
    await page.getByRole('button', { name: 'Create invitation' }).click();
    await expect(page.locator('article').filter({ hasText: fixture!.invitedUser.email })).toBeVisible();

    const invitation = await fixture!.admin
      .from('organization_invitations')
      .select('id')
      .eq('organization_id', fixture!.organizationId)
      .eq('email', fixture!.invitedUser.email)
      .eq('status', 'pending')
      .single();
    expect(invitation.error, JSON.stringify(invitation.error)).toBeNull();
    const invitationId = invitation.data!.id;

    await signOut(page);
    await page.goto(`/invite/accept?invitation=${invitationId}`);
    await expect(page).toHaveURL(/\/login\?next=/, { timeout: 30_000 });
    await signIn(page, fixture!.invitedUser, new RegExp(`/invite/accept\\?invitation=${invitationId}`));
    const acceptanceResponse = page.waitForResponse((response) => {
      const url = new URL(response.url());
      return response.request().method() === 'POST'
        && url.pathname === `/api/organization/invitations/${invitationId}/accept`;
    });
    await page.getByRole('button', { name: 'Accept organization invitation' }).click();
    expect((await acceptanceResponse).status(), 'Invitation acceptance must succeed').toBe(200);
    await expect(page).toHaveURL(/\/modelops$/, { timeout: 30_000 });
    await expect(page.getByRole('navigation', { name: 'Workspace navigation' }).getByRole('link', { name: /^Team/ })).toHaveCount(0);

    await page.goto('/settings/members');
    await expect(page).toHaveURL(/\/forbidden$/);
    const forbiddenApiStatus = await page.evaluate(async () => (await fetch('/api/organization/members')).status);
    expect(forbiddenApiStatus).toBe(403);

    await page.goto('/modelops');
    await signOut(page);
    await signIn(page, fixture!.user, /\/modelops$/);
    await page.goto('/settings/members');
    const memberRow = page.getByRole('row').filter({ hasText: fixture!.invitedUser.email });
    await expect(memberRow).toBeVisible();
    await memberRow.getByLabel(`Role for ${fixture!.invitedUser.email}`).selectOption('editor');
    await expect(page.getByText(`Role updated for ${fixture!.invitedUser.email}.`)).toBeVisible();
    page.once('dialog', (dialog) => dialog.accept());
    await memberRow.getByRole('button', { name: 'Remove' }).click();
    await expect(page.getByText(`${fixture!.invitedUser.email} was removed.`)).toBeVisible();
    await expect(page.getByRole('row').filter({ hasText: fixture!.invitedUser.email })).toHaveCount(0);

    await page.getByLabel('Email address').fill(fixture!.invitedUser.email);
    await page.getByLabel('Initial role').selectOption('viewer');
    await page.getByRole('button', { name: 'Create invitation' }).click();
    const pendingInvitation = page.locator('article')
      .filter({ hasText: fixture!.invitedUser.email })
      .filter({ hasText: 'pending' });
    await expect(pendingInvitation).toContainText('pending');
    await pendingInvitation.getByRole('button', { name: 'Resend' }).click();
    await expect(page.getByText(`Invitation renewed for ${fixture!.invitedUser.email}.`)).toBeVisible();
    page.once('dialog', (dialog) => dialog.accept());
    await pendingInvitation.getByRole('button', { name: 'Revoke' }).click();
    await expect(page.getByText(`Invitation revoked for ${fixture!.invitedUser.email}.`)).toBeVisible();
    await expect(page.locator('article')
      .filter({ hasText: fixture!.invitedUser.email })
      .filter({ hasText: 'revoked' })).toBeVisible();
  });

  test('switches organizations without retaining records or navigation from the previous tenant', async ({ page }) => {
    test.slow();
    await page.goto('/login');
    await signIn(page, fixture!.user, /\/modelops$/);

    const markerName = `Tenant boundary marker ${crypto.randomUUID()}`;
    const created = await page.request.post('/api/modelops', {
      headers: { 'Idempotency-Key': crypto.randomUUID() },
      data: {
        model_name: markerName,
        version: '1.0.0',
        dataset: 'tenant-boundary-browser-test',
        intended_use: 'Verify active-organization isolation in the protected application shell.',
      },
    });
    const createdBody = await created.text();
    expect(created.status(), createdBody).toBe(200);
    const recordId = (JSON.parse(createdBody) as { record_id: string }).record_id;
    await page.reload();
    await expect(page.getByText(markerName, { exact: true })).toBeVisible();

    const secondOrganization = await fixture!.admin
      .from('organizations')
      .insert({ name: `ModelOps alternate tenant ${crypto.randomUUID()}` })
      .select('id')
      .single();
    expect(secondOrganization.error, JSON.stringify(secondOrganization.error)).toBeNull();
    const secondOrganizationId = secondOrganization.data!.id;

    try {
      const membership = await fixture!.admin.from('memberships').insert({
        organization_id: secondOrganizationId,
        user_id: fixture!.user.id,
        role: 'viewer',
      });
      expect(membership.error, JSON.stringify(membership.error)).toBeNull();

      const activateOriginal = await page.request.post('/api/organization/active', { data: { organization_id: fixture!.organizationId } });
      expect(activateOriginal.status(), await activateOriginal.text()).toBe(200);
      await page.reload();

      const organizationSelector = page.locator('header').getByLabel('Active organization');
      await expect(organizationSelector.locator('option')).toHaveCount(2);
      const switchResponse = page.waitForResponse((response) => response.request().method() === 'POST' && new URL(response.url()).pathname === '/api/organization/active');
      const switchedDocument = page.waitForEvent('load');
      await organizationSelector.selectOption(secondOrganizationId);
      expect((await switchResponse).status()).toBe(200);
      await switchedDocument;
      await expect(page.locator('header').getByLabel('Active organization')).toHaveValue(secondOrganizationId);
      await expect(page).toHaveURL(/\/evaluations$/);
      await expect(page.getByText('No matching evaluations')).toBeVisible();
      await expect(page.getByText(markerName, { exact: true })).toHaveCount(0);
      await expect(page.getByRole('navigation', { name: 'Workspace navigation' }).getByRole('link', { name: /^Team/ })).toHaveCount(0);
      await expect(page.getByRole('link', { name: 'New evaluation' })).toHaveCount(0);
      await expect(page.getByRole('link', { name: 'Compare records' })).toHaveCount(0);

      await page.goto(`/evaluations/${recordId}`);
      await expect(page.getByRole('heading', { name: 'Evaluation unavailable' })).toBeVisible();
      await expect(page.getByText('This evaluation was not found in the active organization.')).toBeVisible();

      const returnResponse = page.waitForResponse((response) => response.request().method() === 'POST' && new URL(response.url()).pathname === '/api/organization/active');
      const returnedDocument = page.waitForEvent('load');
      await page.locator('header').getByLabel('Active organization').selectOption(fixture!.organizationId);
      expect((await returnResponse).status()).toBe(200);
      await returnedDocument;
      await expect(page.locator('header').getByLabel('Active organization')).toHaveValue(fixture!.organizationId);
      await expect(page.getByText(markerName, { exact: true })).toBeVisible();
      await expect(page.getByRole('navigation', { name: 'Workspace navigation' }).getByRole('link', { name: /^Team/ })).toBeVisible();
    } finally {
      await page.request.post('/api/organization/active', { data: { organization_id: fixture!.organizationId } });
      const cleanup = await fixture!.admin.from('organizations').delete().eq('id', secondOrganizationId);
      expect(cleanup.error, JSON.stringify(cleanup.error)).toBeNull();
    }
  });
});
