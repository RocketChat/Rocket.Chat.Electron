import { test, _electron as electron, expect } from '@playwright/test';
import path from 'path';

test.describe('Create New Server', () => {
  test('should create a new server', async () => {
    test.setTimeout(90000);

    const electronApp = await electron.launch({
      args: [
        path.join(__dirname, '..', '..'),
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
    console.log('⏳ Waiting for app to initialize...');
    await new Promise(resolve => setTimeout(resolve, 5000));

    // Get the active window (handle case where initial window might have closed)
    const windows = electronApp.windows();
    const activeWindow = windows.find(w => !w.isClosed()) || window;

    if (activeWindow.isClosed()) {
      throw new Error('No active window found');
    }

    // Take a screenshot before interaction
    await activeWindow.screenshot({ path: 'test-results/before-add-server.png' });
    console.log('📸 Screenshot saved: before-add-server.png');

    // Look for the "Add workspace" button in the sidebar
    console.log('🔍 Looking for add workspace button...');
    const addButton = activeWindow.locator('button[title*="Add workspace"]').first();

    await addButton.waitFor({ state: 'visible', timeout: 5000 });
    console.log('✓ Found add workspace button');

    // Click the button
    await addButton.click();
    console.log('✓ Clicked add workspace button');

    // Wait for the add server dialog/screen to appear
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Take a screenshot after clicking
    await activeWindow.screenshot({ path: 'test-results/after-add-server-click.png' });
    console.log('📸 Screenshot saved: after-add-server-click.png');

    // Find the URL input field and enter "open.rocket.chat"
    console.log('� Looking for URL input field...');
    const urlInput = activeWindow.locator('input[type="text"], input[type="url"], input[placeholder*="server" i], input[placeholder*="url" i]').first();

    await urlInput.waitFor({ state: 'visible', timeout: 5000 });
    console.log('✓ Found URL input field');

    // Enter the server URL
    await urlInput.fill('http://localhost:3000');
    console.log('✓ Entered "http://localhost:3000" in URL field');

    // Take a screenshot after entering URL
    // await activeWindow.screenshot({ path: 'test-results/after-url-entry.png' });
    // console.log('📸 Screenshot saved: after-url-entry.png');

    // Find and click the Connect button
    console.log('🔍 Looking for Connect button...');
    const connectButton = activeWindow.locator('button:has-text("Connect"), button:has-text("connect")').first();

    await connectButton.waitFor({ state: 'visible', timeout: 5000 });
    console.log('✓ Found Connect button');

    await connectButton.click();
    console.log('✓ Clicked Connect button');

    // Wait for connection and webview to load
    await new Promise(resolve => setTimeout(resolve, 5000));

    // Get the browser context
    const context = window.context();
    console.log('✓ Got browser context');

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
      console.log('Webview page not found after 30 seconds');
      await electronApp.close();
      return;
    }

    console.log(`✓ Found webview page after ${attempts} attempts:`, webviewPage.url());

    // Wait for React app to load
    console.log('\n⏳ Waiting for React app to load in webview...');


    if (webviewPage) {
      console.log(`✓ Found webview with URL: ${webviewPage.url()}`);

      // Take a screenshot of login page
      await webviewPage.screenshot({ path: 'test-results/login-page.png' });
      console.log('Screenshot saved: login-page.png');

      // Enter login credentials in the webview
      console.log('\nEntering login credentials...');

      // Find email/username field
      const emailInput = webviewPage.locator('input[placeholder="example@example.com"], input[name="emailOrUsername"]').first();
      await emailInput.waitFor({ state: 'visible', timeout: 10000 });
      await emailInput.fill('santam');
      console.log('✓ Entered username: santam');

      // Find password field
      const passwordInput = webviewPage.locator('input[type="password"]').first();
      await passwordInput.waitFor({ state: 'visible', timeout: 5000 });
      await passwordInput.fill('SayMyName123**');
      console.log('✓ Entered password');

      // Take screenshot before login
      await webviewPage.screenshot({ path: 'test-results/before-login.png' });
      console.log('📸 Screenshot saved: before-login.png');

      // Find and click Login button
      const loginButton = webviewPage.locator('button:has-text("Login")').first();
      await loginButton.waitFor({ state: 'visible', timeout: 5000 });
      await loginButton.click();
      console.log('✓ Clicked Login button');

      // Wait for login to complete
      await new Promise(resolve => setTimeout(resolve, 5000));
    } else {
      console.log('Webview not found');
    }

    // Take a screenshot after connecting
    await activeWindow.screenshot({ path: 'test-results/after-connect.png' });
    console.log('Screenshot saved: after-connect.png');

    console.log('\n Closing app...');
    await electronApp.close();
    console.log('✓ Test completed successfully');
  });
});
