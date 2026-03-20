import { Page } from '@playwright/test';

export async function login(page: Page) {
  await page.goto('http://localhost:3000');

  // Wait for login form
  await page.locator('input').first().waitFor({ timeout: 60000 });

  const inputs = page.locator('input');

  await inputs.nth(0).fill('admin');
  await inputs.nth(1).fill('admin123');

  await page.getByRole('button', { name: /login/i }).click();

  // Wait for navigation to home
  await page.waitForURL(/home/, { timeout: 60000 });

  // Small delay for UI stabilization (important for Rocket.Chat)
  await page.waitForTimeout(3000);
}
