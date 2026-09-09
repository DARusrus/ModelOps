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

browserDescribe('ModelOps browser workflow (requires the disposable Supabase runner)', () => {
  let fixture: BrowserFixture | undefined;

  test.beforeAll(async () => { fixture = await createBrowserFixture(); });
  test.afterAll(async () => { await removeBrowserFixture(fixture); });

  test('requires sign-in, saves evaluations, exports a rejected dossier, and compares authorized records', async ({ page }, testInfo) => {
    // This is intentionally a full cross-service journey (Auth, persistence,
    // review transitions, and comparison), so allow normal remote CI variance.
    test.slow();
    await page.goto('/modelops');
    await expect(page).toHaveURL(/\/login$/);
    await page.getByLabel('Email').fill(fixture!.user.email);
    await page.getByLabel('Password').fill(fixture!.user.password);
    await page.getByRole('button', { name: 'Sign in' }).click();
    await expect(page).toHaveURL(/\/modelops$/);
    await page.getByRole('button', { name: 'Blank template' }).click();
    await page.getByLabel('Model name').fill('Browser validated model');
    await page.getByLabel('Version').fill('1.0.0');
    await page.getByTitle('Jump to Intended use').click();
    await page.getByLabel('Primary intended uses').fill('Validate the protected browser workflow using only disposable test data.');
    await page.getByTitle('Jump to Evaluation data').click();
    await page.getByLabel('Evaluation benchmark dataset').fill('browser-e2e-benchmark');
    await page.getByRole('button', { name: 'Generate Model Card' }).click();
    await expect(page.getByText('Browser validated model', { exact: true })).toBeVisible();
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
    await expect(page.getByText('Browser comparison candidate', { exact: true })).toBeVisible();
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
    expect(await scanSeriousAndCriticalViolations(page)).toEqual([]);
    await page.getByLabel('Email').fill(fixture!.user.email);
    await page.getByLabel('Password').fill(fixture!.user.password);
    await page.getByRole('button', { name: 'Sign in' }).click();
    await expect(page).toHaveURL(/\/modelops$/);
    expect(await scanSeriousAndCriticalViolations(page)).toEqual([]);
  });
});
