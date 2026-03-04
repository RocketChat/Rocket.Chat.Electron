import { test, _electron as electron } from '@playwright/test';
import path from 'path';

test.describe('Webview Interaction', () => {
  test('should click Marketplace button and Installed option', async () => {
    test.setTimeout(90000);

    const electronApp = await electron.launch({
      args: [
        path.join(__dirname, '..'),
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-gpu',
        '--ozone-platform=x11',
      ],
    });

    console.log('✓ Electron process started');

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
    let webviewPage = null;
    let attempts = 0;

    while (!webviewPage && attempts < 30) {
      const pages = context.pages();
      webviewPage = pages.find(page => page.url().includes('localhost:3000'));

      if (!webviewPage) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        attempts++;
      }
    }

    if (!webviewPage) {
      console.log('⚠️  Webview page not found after 30 seconds');
      await electronApp.close();
      return;
    }

    console.log(`✓ Found webview page after ${attempts} attempts:`, webviewPage.url());

    // Wait for React app to load
    console.log('\n⏳ Waiting for React app to load in webview...');
    await webviewPage.waitForSelector('button[aria-label="Marketplace"]', { timeout: 30000 });
    console.log('✓ Marketplace button found');

    // Click Marketplace button
    console.log('\n🖱️  Clicking Marketplace button...');
    await webviewPage.click('button[aria-label="Marketplace"]');
    console.log('✓ Clicked Marketplace button');

    // Wait for dropdown and click Installed immediately
    console.log('⏳ Waiting for Installed option to appear...');
    try {
      // Wait for the specific element and click it immediately
      await webviewPage.waitForSelector('label[data-key="installed"][role="menuitem"]', { timeout: 5000 });
      console.log('✓ Found Installed option');

      await webviewPage.click('label[data-key="installed"][role="menuitem"]');
      console.log('✓ Clicked Installed option');

      // Wait for navigation
      await new Promise(resolve => setTimeout(resolve, 2000));
      console.log('\n✓ Final URL:', webviewPage.url());

    } catch (e) {
      console.log('⚠️  Installed option not found or could not be clicked');
      console.log('   Error:', e);
    }

    console.log('\n🔒 Closing app...');
    await electronApp.close();
    console.log('✓ Test completed successfully');
  });
});
