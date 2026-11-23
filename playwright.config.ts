import { defineConfig, devices } from '@playwright/test';

const local = 'http://localhost:4321';
const remote = process.env.SMOKE_BASE_URL;

export default defineConfig({
  testDir: 'tests',
  testMatch: ['e2e/**/*.spec.ts', 'a11y/**/*.spec.ts'],
  forbidOnly: Boolean(process.env.CI),
  reporter: [['list'], ['html', { open: 'never' }]],
  use: { baseURL: remote ?? local, trace: 'retain-on-failure' },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile', use: { ...devices['Pixel 7'] } },
  ],
  webServer: remote
    ? undefined
    : {
        command: 'npx wrangler dev --port 4321',
        url: local,
        env: { WRANGLER_SEND_METRICS: 'false' },
        reuseExistingServer: false,
      },
});
