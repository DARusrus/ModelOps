import { defineConfig, devices } from '@playwright/test';

const enabled = process.env.RUN_MODELOPS_BROWSER_E2E === 'true';
const baseURL = process.env.MODELOPS_BROWSER_E2E_BASE_URL || 'http://127.0.0.1:3100';

export default defineConfig({
  testDir: './tests/browser',
  forbidOnly: Boolean(process.env.CI),
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['html', { open: 'never' }], ['github']] : [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    ...devices['Desktop Chrome'],
  },
  webServer: enabled
    ? {
        command: 'node node_modules/next/dist/bin/next dev --hostname 127.0.0.1 --port 3100',
        url: baseURL,
        reuseExistingServer: false,
        timeout: 120_000,
      }
    : undefined,
});
