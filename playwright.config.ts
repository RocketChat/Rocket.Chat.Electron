import { defineConfig } from '@playwright/test';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

export default defineConfig({
  testDir: './tests',

  timeout: 60000,

  workers: 1,
  fullyParallel: false,

  // Retry on CI (improves stability)
  retries: process.env.CI ? 2 : 0,

  reporter: [
    ['list'],
    ['html'],
    // Fixed JUnit path issue
    ['junit', { outputFile: 'test-results/results.xml' }]
  ],

  use: {
    headless: true,

    // Base URL from environment
    baseURL: process.env.BASE_URL || 'http://localhost:3000',

    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure'
  }
});
