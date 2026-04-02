import { Page } from '@playwright/test';

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const USERNAME = process.env.E2E_USERNAME || 'admin';
const PASSWORD = process.env.E2E_PASSWORD || 'admin123';

export async function login(page: Page): Promise<void> {
  await page.goto(BASE_URL);

 // Prefer semantic selectors when possible, fallback due to dynamic UI rendering
  const inputs = page.locator('input');

// Wait for login form to be ready
  await inputs.first().waitFor({ timeout: 60000 });

// Prefer semantic selectors when available, fallback to index-based selectors
// due to dynamic rendering and lack of stable attributes in Rocket.Chat login UI
  await inputs.nth(0).fill(USERNAME);
  await inputs.nth(1).fill(PASSWORD);

  await page.getByRole('button', { name: /login/i }).click();

  await page.waitForURL(/\/home\/?$/, { timeout: 60000 });

 
// Wait for actual UI instead of networkidle
  await page.locator('body').waitFor({ timeout: 60000 });
  
}
