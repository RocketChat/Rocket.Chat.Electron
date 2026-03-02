import { _electron as electron } from '@playwright/test';
import type { ElectronApplication, Page } from '@playwright/test';
import path from 'path';

export interface ElectronTestContext {
  app: ElectronApplication;
  window: Page;
}

export async function launchElectronApp(): Promise<ElectronTestContext> {
  const app = await electron.launch({
    args: [
      path.join(__dirname, '../../app/main.js'),
      '--no-sandbox',
      '--disable-setuid-sandbox',
    ],
    env: {
      ...process.env,
      NODE_ENV: 'test',
    },
    timeout: 30000,
  });

  const window = await app.firstWindow();
  await window.waitForLoadState('domcontentloaded');

  return { app, window };
}

export async function closeElectronApp(app: ElectronApplication): Promise<void> {
  await app.close();
}

export async function waitForElement(
  page: Page,
  selector: string,
  timeout = 5000
): Promise<boolean> {
  try {
    await page.waitForSelector(selector, { timeout });
    return true;
  } catch {
    return false;
  }
}

export async function takeScreenshot(
  page: Page,
  name: string
): Promise<void> {
  await page.screenshot({
    path: `e2e/test-results/screenshots/${name}.png`,
    fullPage: true,
  });
}
