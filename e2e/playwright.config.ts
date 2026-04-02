import { defineConfig } from '@playwright/test';
import * as dotenv from 'dotenv';

dotenv.config();

export default defineConfig({
  testDir: './tests',
  timeout: 60000,

  workers: 1,
  fullyParallel: false,

  // Added retries
  retries: process.env.CI ? 2 : 0,

  reporter: [
    ['list'],
    ['html'],
    ['junit', { outputFile: 'test-results/junit/results.xml' }]
  ],

  use: {
    headless: true,

    // Added baseURL
    baseURL: process.env.BASE_URL || 'http://localhost:3000',

    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure'
  }
});
