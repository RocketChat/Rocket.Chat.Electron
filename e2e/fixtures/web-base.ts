import { test as base, Page, expect } from '@playwright/test';

type WebFixtures = {
  homePage: Page;
};

export const test = base.extend<WebFixtures>({
  homePage: async ({ page }, use) => {
    await page.goto('http://localhost:3000/home');
    console.log('✓ Navigated to http://localhost:3000/home');
    await use(page);
  },
});

export { expect };