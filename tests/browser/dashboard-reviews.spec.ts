import { expect, test } from '@playwright/test';
import axe from 'axe-core';
import { createBrowserFixture, removeBrowserFixture, type BrowserFixture } from './fixtures';
import { signInBrowserUser } from './auth';

const enabled = process.env.RUN_MODELOPS_BROWSER_E2E === 'true';
const browserDescribe = enabled ? test.describe : test.describe.skip;

async function accessibilityViolations(page: import('@playwright/test').Page) {
  await page.addScriptTag({ content: axe.source });
  return page.evaluate(async () => {
    const result = await (window as unknown as Window & { axe: typeof axe }).axe.run();
    return result.violations.filter((violation) => ['serious', 'critical'].includes(violation.impact || ''));
  });
}

browserDescribe('ModelOps dashboard and review queue', () => {
  let fixture: BrowserFixture | undefined;
  let submittedCardId = '';

  test.describe.configure({ timeout: 90_000 });

  test.beforeAll(async () => {
    fixture = await createBrowserFixture();
    submittedCardId = crypto.randomUUID();
    const card = await fixture.admin.from('model_cards').insert({
      id: submittedCardId,
      organization_id: fixture.organizationId,
      created_by: fixture.user.id,
      payload: {
        model_name: 'Dashboard review candidate',
        version: '7.0.0',
        dataset: 'dashboard-browser-benchmark',
        intended_use: 'Validate the reviewer dashboard and deep-link workflow.',
        readiness_score: 72,
        decision: 'pending_human_review',
        evidence_items: [],
      },
      readiness_score: 72,
      rubric_version: 'browser-dashboard',
      workflow_state: 'draft',
    });
    if (card.error) throw new Error(`Create dashboard browser card failed: ${card.error.message}`);
    const submission = await fixture.admin.rpc('attest_model_card_as', {
      requesting_actor: fixture.user.id,
      target_card: submittedCardId,
      requested_action: 'submitted',
      requested_reason: 'Dashboard browser fixture submission.',
      requested_policy_id: 'enterprise_general',
    });
    if (submission.error) throw new Error(`Submit dashboard browser card failed: ${submission.error.message}`);
    const viewerMembership = await fixture.admin.from('memberships').insert({
      organization_id: fixture.organizationId,
      user_id: fixture.onboardingUser.id,
      role: 'viewer',
    });
    if (viewerMembership.error) throw new Error(`Create dashboard viewer membership failed: ${viewerMembership.error.message}`);
  });

  test.afterAll(async () => { await removeBrowserFixture(fixture); });

  test('lands on exact organization state and opens pending work at the policy tab', async ({ page }) => {
    await page.goto('/login');
    await signInBrowserUser(page, fixture!.user, /\/dashboard$/);
    await expect(page.getByRole('heading', { name: 'Organization dashboard' })).toBeVisible();
    await expect(page.getByText('Dashboard review candidate', { exact: true })).toBeVisible();
    await expect(page.getByRole('link', { name: /^Reviews/ })).toBeVisible();
    expect(await accessibilityViolations(page)).toEqual([]);

    await page.getByRole('navigation', { name: 'Workspace navigation' }).getByRole('link', { name: /^Reviews/ }).click();
    await expect(page).toHaveURL(/\/reviews$/);
    await page.getByRole('button', { name: 'Submitted' }).click();
    await expect(page).toHaveURL(/\/reviews\?state=submitted$/);
    const reviewCard = page.locator('article').filter({ hasText: 'Dashboard review candidate' });
    await expect(reviewCard).toContainText(fixture!.user.email);
    await expect(reviewCard.getByText('submitted', { exact: true })).toBeVisible();
    expect(await accessibilityViolations(page)).toEqual([]);
    await reviewCard.getByRole('link', { name: 'Open review' }).click();
    await expect(page).toHaveURL(new RegExp(`/evaluations/${submittedCardId}\\?tab=policy$`));
    await expect(page.getByRole('region', { name: 'Review attestation' })).toBeVisible();
  });

  test('keeps review navigation and the route unavailable to viewers', async ({ page }) => {
    await page.goto('/login');
    await signInBrowserUser(page, fixture!.onboardingUser, /\/dashboard$/);
    await expect(page.getByRole('navigation', { name: 'Workspace navigation' }).getByRole('link', { name: /^Reviews/ })).toHaveCount(0);
    await page.goto('/reviews');
    await expect(page).toHaveURL(/\/forbidden$/);
    expect(await page.evaluate(async () => (await fetch('/api/reviews')).status)).toBe(403);
  });
});
