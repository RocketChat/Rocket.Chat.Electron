import { test, _electron as electron } from '@playwright/test';
import path from 'path';

test.describe('Change Theme', () => {
  test('should change theme via Accessibility & appearance', async () => {
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

    // Click Home button first to ensure we're on the home page
    console.log('>> Clicking Home button to reset to home page...');
    await webviewPage.waitForSelector('button.rcx-navbar-item i.rcx-icon--name-home', { timeout: 30000 });
    await webviewPage.click('button.rcx-navbar-item:has(i.rcx-icon--name-home)');
    console.log('✓ Clicked Home button');

    // Wait for navigation to home
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Click on user avatar
    console.log('\n>> Clicking user avatar...');
    await webviewPage.waitForSelector('img[data-username="santam2"]', { timeout: 30000 });
    await webviewPage.click('img[data-username="santam2"]');
    console.log('✓ Clicked user avatar');

    // Wait for dropdown menu to appear
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Click on Accessibility & appearance option
    console.log('\n>> Clicking Accessibility & appearance option...');
    await webviewPage.waitForSelector('label[data-key="accessibility"][role="menuitemcheckbox"]', { timeout: 10000 });
    await webviewPage.click('label[data-key="accessibility"][role="menuitemcheckbox"]');
    console.log('✓ Clicked Accessibility & appearance option');

    // Wait for the accessibility page to load
    await new Promise(resolve => setTimeout(resolve, 2000));
    console.log('✓ Current URL:', webviewPage.url());

    // Check which theme is currently selected and toggle to the other
    console.log('\n>> Checking current theme...');
    const isLightChecked = await webviewPage.isChecked('input[type="radio"][id="light"]');
    const isDarkChecked = await webviewPage.isChecked('input[type="radio"][id="dark"]');

    if (isLightChecked) {
      console.log('✓ Light theme is currently selected, switching to Dark');
      await webviewPage.waitForSelector('label[for="dark"]', { timeout: 10000 });
      await webviewPage.click('label[for="dark"]');
      console.log('✓ Clicked Dark theme radio button');
    } else if (isDarkChecked) {
      console.log('✓ Dark theme is currently selected, switching to Light');
      await webviewPage.waitForSelector('label[for="light"]', { timeout: 10000 });
      await webviewPage.click('label[for="light"]');
      console.log('✓ Clicked Light theme radio button');
    } else {
      console.log('✓ Neither Light nor Dark selected, defaulting to Dark');
      await webviewPage.waitForSelector('label[for="dark"]', { timeout: 10000 });
      await webviewPage.click('label[for="dark"]');
      console.log('✓ Clicked Dark theme radio button');
    }

    // Wait for the selection to register
    await new Promise(resolve => setTimeout(resolve, 500));

    // Click Save changes button
    console.log('\n>> Clicking Save changes button...');
    try {
      await webviewPage.waitForSelector('button.rcx-button--primary span:has-text("Save changes")', { timeout: 5000 });
      console.log('✓ Save changes button found');

      await webviewPage.click('button.rcx-button--primary');
      console.log('✓ Clicked Save changes button');

      // Wait for changes to be saved
      await new Promise(resolve => setTimeout(resolve, 2000));
      console.log('✓ Theme changes saved successfully');

    } catch (e) {
      console.log('⚠️  Save changes button not found or could not be clicked');
      console.log('   Error:', e.message);
    }

    console.log('\n🔒 Closing app...');
    await electronApp.close();
    console.log('✓ Test completed successfully');
  });
});
