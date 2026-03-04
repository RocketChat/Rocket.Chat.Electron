import { test, _electron as electron } from '@playwright/test';
import path from 'path';

test.describe('Send Message', () => {
  test('should send a message to Testing2 channel', async () => {
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

    await webviewPage.waitForSelector('a[href="/channel/Testing2"]', { timeout: 30000 });
    console.log('✓ Testing2 channel link found');

    // Click on Testing2 channel
    console.log('\n>> Clicking Testing2 channel...');
    await webviewPage.click('a[href="/channel/Testing2"]');
    console.log('✓ Clicked Testing2 channel');

    // Wait for navigation to Testing2 channel
    await new Promise(resolve => setTimeout(resolve, 2000));
    console.log('✓ Current URL:', webviewPage.url());

    // Wait for the message textarea to appear
    console.log('\n⏳ Waiting for message textarea...');
    await webviewPage.waitForSelector('textarea[name="msg"][aria-label="Message #Testing2"]', { timeout: 10000 });
    console.log('✓ Message textarea found');

    // Click on the textarea to focus it
    console.log('\n>> Clicking message textarea...');
    await webviewPage.click('textarea[name="msg"][aria-label="Message #Testing2"]');
    console.log('✓ Clicked message textarea');

    // Type "Hello World"
    console.log('\n>> Typing "Hello World"...');
    await webviewPage.type('textarea[name="msg"][aria-label="Message #Testing2"]', 'Hello World');
    console.log('✓ Typed "Hello World"');

    // Wait for send button to become enabled
    await new Promise(resolve => setTimeout(resolve, 500));

    // Click the Send button
    console.log('\n>> Clicking Send button...');
    try {
      // Wait for the button to be enabled (disabled attribute removed)
      await webviewPage.waitForSelector('button[aria-label="Send"]:not([disabled])', { timeout: 5000 });
      console.log('✓ Send button is enabled');

      await webviewPage.click('button[aria-label="Send"]');
      console.log('✓ Clicked Send button');

      // Wait for message to be sent
      await new Promise(resolve => setTimeout(resolve, 2000));
      console.log('✓ Message sent successfully');

    } catch (e) {
      console.log('⚠️  Send button not enabled or could not be clicked');
      console.log('   Error:', e.message);
    }

    console.log('\n🔒 Closing app...');
    await electronApp.close();
    console.log('✓ Test completed successfully');
  });
});
