import { test, expect } from '@playwright/test';
import { login } from '../utils/auth';

test('User can login successfully', async ({ page }) => {
  await login(page);

  // Verify successful login
  await expect(page).toHaveURL(/home/);
});
