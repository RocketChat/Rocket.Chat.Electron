import { Page } from '@playwright/test';

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const USERNAME = process.env.E2E_USERNAME || 'admin';
const PASSWORD = process.env.E2E_PASSWORD || 'admin123';

export async function login(page: Page): Promise<void> {
  await page.goto(BASE_URL);

// Using index-based fallback due to dynamic UI rendering in Rocket.Chat
  const inputs = page.locator('input');
  await inputs.first().waitFor({ timeout: 60000 });

  await inputs.nth(0).fill(USERNAME);
  await inputs.nth(1).fill(PASSWORD);

  await page.getByRole('button', { name: /login/i }).click();

  await page.waitForURL(/\/home\/?$/, { timeout: 60000 });

 
  await page.waitForLoadState('networkidle');
  
}
