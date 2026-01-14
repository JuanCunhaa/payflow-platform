import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 60_000,
  expect: {
    timeout: 10_000,
  },
  fullyParallel: true,
  retries: process.env.CI ? 2 : 0,
  reporter: [['list'], ['html', { outputFolder: 'playwright-report', open: 'never' }]],
  use: {
    baseURL: 'http://localtest.me:3000',
    trace: 'on-first-retry',
    headless: true,
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: 'cd ../.. && npm run dev',
    url: 'http://localhost:3000/pt-BR',
    reuseExistingServer: true,
    timeout: 180_000,
    env: {
      // Disable rate limiting only during Playwright runs
      BYPASS_RATE_LIMIT_FOR_TESTS: '1',
      NEXT_PUBLIC_BYPASS_RATE_LIMIT_FOR_TESTS: '1',
    },
  },
});
