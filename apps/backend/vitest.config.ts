import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    setupFiles: ['./test/setup.ts'],
    env: {
      DATABASE_URL: 'postgresql://pontuarh:PontuaRH_2026_Dev@localhost:5432/pontuarh_test_db?schema=public',
    },
  },
});

