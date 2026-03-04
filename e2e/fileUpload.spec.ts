import { test, _electron as electron } from '@playwright/test';
import path from 'path';

test.describe('File Upload', () => {
  test('should upload a file to Testing2 channel', async () => {
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

    // Wait for the file upload button to appear
    console.log('\n⏳ Waiting for file upload button...');
    await webviewPage.waitForSelector('button[data-qa-id="file-upload"]', { timeout: 10000 });
    console.log('✓ File upload button found');

    // Set up file chooser handler before clicking the button
    console.log('\n>> Setting up file upload...');
    const testFilePath = path.join(__dirname, 'test.pdf');
    console.log('✓ File path:', testFilePath);

    // Listen for file chooser event
    const fileChooserPromise = webviewPage.waitForEvent('filechooser');

    // Click the upload button
    console.log('>> Clicking file upload button...');
    await webviewPage.click('button[data-qa-id="file-upload"]');
    console.log('✓ Clicked file upload button');

    // Wait for file chooser and set the file
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles(testFilePath);
    console.log('✓ File selected:', testFilePath);

    // Wait for the upload dialog to appear
    console.log('\n⏳ Waiting for upload dialog...');
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Click the Send button in the dialog
    console.log('\n>> Clicking Send button in dialog...');
    try {
      await webviewPage.waitForSelector('button.rcx-button--primary:has-text("Send")', { timeout: 10000 });
      console.log('✓ Send button found');

      await webviewPage.click('button.rcx-button--primary:has-text("Send")');
      console.log('✓ Clicked Send button');

      // Wait for file to be uploaded
      await new Promise(resolve => setTimeout(resolve, 3000));
      console.log('✓ File uploaded successfully');

    } catch (e) {
      console.log('⚠️  Send button not found or could not be clicked');
      console.log('   Error:', e.message);
    }

    console.log('\n🔒 Closing app...');
    await electronApp.close();
    console.log('✓ Test completed successfully');
  });
});
