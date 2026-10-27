import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  timeout: 60 * 1000,
  expect: {
    timeout: 10 * 1000,
  },
  fullyParallel: false,
  workers: 1,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: 'http://localhost:3000',
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
  webServer: [
    {
      command: 'npm --workspace=@pontuarh/backend run dev',
      port: 3001,
      timeout: 120 * 1000,
      reuseExistingServer: true,
    },
    {
      command: 'npm --workspace=@pontuarh/frontend run dev',
      port: 3000,
      timeout: 120 * 1000,
      reuseExistingServer: true,
    },
  ],
});
