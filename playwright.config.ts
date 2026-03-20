import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e/tests',   // 🔥 ONLY run your tests

  timeout: 60000,

  use: {
    headless: false,
    baseURL: 'http://localhost:3000',
  },
});
