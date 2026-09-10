import { defineConfig, devices } from '@playwright/test';

const enabled = process.env.RUN_MODELOPS_PERFORMANCE === 'true';
const baseURL = process.env.MODELOPS_PERFORMANCE_BASE_URL || 'http://127.0.0.1:3200';
const stabilitySeconds = Number(process.env.MODELOPS_PERFORMANCE_STABILITY_SECONDS || 15);

export default defineConfig({
  testDir: './tests/performance',
  forbidOnly: Boolean(process.env.CI),
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: (stabilitySeconds + 120) * 1_000,
  reporter: [['list'], ['html', { open: 'never', outputFolder: 'playwright-performance-report' }]],
  use: {
    baseURL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    ...devices['Desktop Chrome'],
  },
  webServer: enabled
    ? {
        command: 'node node_modules/next/dist/bin/next dev --hostname 127.0.0.1 --port 3200',
        url: baseURL,
        reuseExistingServer: false,
        timeout: 120_000,
      }
    : undefined,
});
