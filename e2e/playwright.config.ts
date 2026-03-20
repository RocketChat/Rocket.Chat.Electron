import { defineConfig } from '@playwright/test';
import * as dotenv from 'dotenv';
dotenv.config();

export default defineConfig({
  testDir: './tests',
  timeout: 60000,

  workers: 1,
  fullyParallel: false,

  reporter: [
    ['list'],
    ['html'],
    ['junit', { outputFile: 'test-results/junit/results.xml' }]
  ],

  use: {
    headless: true,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure'
  }
});