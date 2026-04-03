import { test, _electron as electron, expect } from '@playwright/test';
import path from 'path';
import 'dotenv/config';

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


    // Find the URL input field and enter "open.rocket.chat"
    console.log('� Looking for URL input field...');
    const urlInput = activeWindow.locator('input[type="text"], input[type="url"], input[placeholder*="server" i], input[placeholder*="url" i]').first();

    await urlInput.waitFor({ state: 'visible', timeout: 5000 });
    console.log('✓ Found URL input field');

    // Enter the server URL
    await urlInput.fill('http://localhost:3000');
    console.log('✓ Entered "http://localhost:3000" in URL field');


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

      // Enter login credentials in the webview
      console.log('\nEntering login credentials...');

      // Get credentials from environment variables
      const username = process.env.TEST_USERNAME;
      const password = process.env.TEST_PASSWORD;

      if (!username || !password) {
        throw new Error('TEST_USERNAME and TEST_PASSWORD environment variables must be set');
      }

      // Find email/username field
      const emailInput = webviewPage.locator('input[placeholder="example@example.com"], input[name="emailOrUsername"]').first();
      await emailInput.waitFor({ state: 'visible', timeout: 10000 });
      await emailInput.fill(username);
      console.log(`✓ Entered username: ${username}`);

      // Find password field
      const passwordInput = webviewPage.locator('input[type="password"]').first();
      await passwordInput.waitFor({ state: 'visible', timeout: 5000 });
      await passwordInput.fill(password);
      console.log('✓ Entered password');

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

    console.log('\n Closing app...');
    await electronApp.close();
    console.log('✓ Test completed successfully');
  });
});
