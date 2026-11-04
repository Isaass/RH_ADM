import { defineConfig, devices } from '@playwright/test';

process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgresql://pontuarh:PontuaRH_2026_Dev@127.0.0.1:5432/pontuarh_test_db?schema=public';

const dbUrl = process.env.DATABASE_URL || '';
if (!dbUrl.includes('test_db') && !dbUrl.includes('_test')) {
  throw new Error(
    '[SEGURANÇA BLOQUEADA] Execução do Playwright interrompida: a URL do banco não aponta para um ambiente de teste isolado autorizado!'
  );
}

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
      reuseExistingServer: false,
      env: {
        DATABASE_URL: 'postgresql://pontuarh:PontuaRH_2026_Dev@127.0.0.1:5432/pontuarh_test_db?schema=public',
        PORT: '3001',
      },
    },
    {
      command: 'npm --workspace=@pontuarh/frontend run start',
      port: 3000,
      timeout: 120 * 1000,
      reuseExistingServer: false,
    },
  ],
});
