import { defineConfig, devices } from '@playwright/test';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

export default defineConfig({
  testDir: './tests',
  // Per-ticket specs (tests/tickets/<TICKET>.spec.ts) run only in a ticket QA run (TICKET=BELL-123),
  // never as part of regression.
  testIgnore: process.env.TICKET ? undefined : '**/tickets/**',
  timeout: 90_000,
  expect: {
    timeout: 10_000,
  },
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: [
    ['html', { open: 'never' }],
    ['json', { outputFile: 'results.json' }],
    ['list'],
  ],
  globalSetup: require.resolve('./global-setup'),
  use: {
    baseURL: process.env.BASE_URL || 'https://bellavitaorganic.com/',
    storageState: path.join(__dirname, 'auth', 'storefront.json'),
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
