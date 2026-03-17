import { test as base, expect, _electron as electron, ElectronApplication, Page } from '@playwright/test';
import path from 'path';

type TestFixtures = {
  electronApp: ElectronApplication;
  webviewPage: Page;
};

export const test = base.extend<TestFixtures>({
  electronApp: async ({}, use) => {
    const electronApp = await electron.launch({
      args: [
        path.join(__dirname, '..', '..'), // Go up two levels from fixtures folder
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-gpu',
        '--ozone-platform=x11',
      ],
    });

    console.log('✓ Electron process started');
    await use(electronApp);
    await electronApp.close();
    console.log('✓ Electron app closed');
  },

  webviewPage: async ({ electronApp }, use) => {
    const window = await electronApp.firstWindow({ timeout: 60000 });
    console.log('✓ Window opened:', window.url());

    // Wait for app to initialize
    console.log('⏳ Waiting for app to initialize (5 seconds)...');
    await new Promise(resolve => setTimeout(resolve, 5000));

    // Get the browser context
    const context = window.context();
    console.log('✓ Got browser context');

    // Wait for webview page to appear
    console.log('⏳ Waiting for webview page to appear...');
    let webviewPage: Page | null = null;
    let attempts = 0;

    while (!webviewPage && attempts < 30) {
      const pages = context.pages();
      webviewPage = pages.find(page => page.url().includes('localhost:3000')) || null;

      if (!webviewPage) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        attempts++;
      }
    }

    if (!webviewPage) {
      throw new Error('⚠️  Webview page not found after 30 seconds');
    }

    console.log(`✓ Found webview page after ${attempts} attempts:`, webviewPage.url());

    // Wait for React app to load
    console.log('\n⏳ Waiting for React app to load in webview...');

    // Click Home button first to ensure we're on the home page
    console.log('>> Clicking Home button to reset to home page...');
    await webviewPage.waitForSelector('button.rcx-navbar-item i.rcx-icon--name-home', { timeout: 30000 });
    await webviewPage.click('button.rcx-navbar-item:has(i.rcx-icon--name-home)');
    console.log('✓ Clicked Home button');

    // Wait for navigation to home
    await new Promise(resolve => setTimeout(resolve, 2000));

    await use(webviewPage);
  },
});

export { expect };
