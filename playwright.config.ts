import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',

  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 2 : 0,
  timeout: 60000,

  reporter: [
    ['line'],
    [
      'allure-playwright',
      {
        resultsDir: 'allure-report',

        detail: true,
        suiteTitle: true,

        screenshots: true,
        traces: true,
        videos: true,

        attachments: true,

        links: {
          issue: {
            nameTemplate: 'Issue #%s',
            urlTemplate: 'https://github.com/yourrepo/issues/%s',
          },
          tms: {
            nameTemplate: 'TMS #%s',
            urlTemplate: 'https://tms.company.com/tests/%s',
          },
        },

        environmentInfo: {
          Framework: 'Playwright',
          Language: 'TypeScript',
          Node: process.version,
          OS: process.platform,
          Tester: 'Santam Roy Choudhury'
        },
      },
    ],
  ],

  use: {
    baseURL: 'http://localhost:3000',

    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    trace: 'retain-on-failure',

    actionTimeout: 15000,
    navigationTimeout: 30000,
  },

  outputDir: 'test-results',

  projects: [
    { name: 'setup', testMatch: /.*\.setup\.ts/ },
    {
      name: 'chromium',
      use: { browserName: 'chromium' },
    },
  ],
});