import { test, _electron as electron } from '@playwright/test';
import path from 'path';

test.describe('Switch Servers', () => {
  test('should switch between servers', async () => {
    test.setTimeout(180000);

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

    // Get the active window
    const windows = electronApp.windows();
    const activeWindow = windows.find(w => !w.isClosed()) || window;

    if (activeWindow.isClosed()) {
      throw new Error('No active window found');
    }

    // Wait for webview to load
    console.log('⏳ Waiting for webview to load...');
    const context = activeWindow.context();
    let webviewPage: any = null;
    let attempts = 0;

    while (!webviewPage && attempts < 60) {
      const pages = context.pages();
      webviewPage = pages.find((page: any) => page.url().includes('localhost:3000')) || null;

      if (!webviewPage) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        attempts++;
      }
    }

    if (!webviewPage) {
      throw new Error('Webview page not found after 60 seconds');
    }

    console.log(`✓ Found webview page after ${attempts} attempts`);
    console.log('⏳ Waiting for Home button to appear in webview...');
    try {
      await webviewPage.waitForSelector('button[title="Home"]', { timeout: 60000 });
      console.log('✓ Home button found - webview fully loaded');
    } catch (error) {
      console.log('⚠️  Home button not found, continuing anyway...');
    }
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Find server buttons in the sidebar
    console.log('\n🔍 Looking for server buttons...');

    const allButtons = await activeWindow.locator('button').all();
    const serverButtons = [];

    for (let i = 0; i < Math.min(allButtons.length, 15); i++) {
      const button = allButtons[i];
      const isVisible = await button.isVisible().catch(() => false);
      const title = await button.getAttribute('title').catch(() => null);

      // Server buttons are visible and not the Add/Customize buttons
      if (isVisible && (!title || (!title.includes('Add workspace') && !title.includes('Customize') && !title.includes('control')))) {
        const hasContent = await button.textContent().catch(() => '');
        if (hasContent || !title) {
          serverButtons.push({ button, index: i + 1 });
          console.log(`  Found server button ${serverButtons.length} (Button ${i + 1})`);
        }
      }
    }

    console.log(`\nTotal server buttons found: ${serverButtons.length}`);

    if (serverButtons.length >= 2) {
      const firstServer = serverButtons[0];
      const secondServer = serverButtons[1];

      // SERVER 1 - First message
      console.log(`\n🖱️  Clicking first server (Button ${firstServer.index})...`);
      await firstServer.button.click();
      await new Promise(resolve => setTimeout(resolve, 3000));

      console.log('🏠 Waiting for Home button to appear...');
      await webviewPage.waitForSelector('button[title="Home"]', { timeout: 60000 });
      console.log('✓ Home button found');

      console.log('🏠 Clicking Home button...');
      await webviewPage.click('button[title="Home"]');
      await new Promise(resolve => setTimeout(resolve, 2000));

      console.log('⏳ Waiting for Testing2 channel to appear...');
      await webviewPage.waitForSelector('a[href="/channel/Testing2"]', { timeout: 60000 });
      console.log('✓ Testing2 channel found');

      console.log('📝 Navigating to Testing2 channel...');
      await webviewPage.click('a[href="/channel/Testing2"]');
      await new Promise(resolve => setTimeout(resolve, 2000));

      console.log('✍️  Typing "Testing Message 1"...');
      const textarea1 = await webviewPage.waitForSelector('textarea[name="msg"]', { timeout: 10000 });
      await textarea1.fill('Testing Message 1');
      await webviewPage.waitForSelector('button[aria-label="Send"]:not([disabled])', { timeout: 5000 });
      await webviewPage.click('button[aria-label="Send"]');
      console.log('✓ Sent "Testing Message 1" in Testing2 channel');
      await new Promise(resolve => setTimeout(resolve, 2000));

      // SERVER 2 - Second message
      console.log(`\n🖱️  Clicking second server (Button ${secondServer.index})...`);
      await secondServer.button.click();
      await new Promise(resolve => setTimeout(resolve, 3000));

      // Wait for webview to load - Server 2 is on open.rocket.chat
      console.log('⏳ Waiting for server 2 webview to load...');
      let webviewPage2: any = null;
      let attempts2 = 0;

      while (!webviewPage2 && attempts2 < 60) {
        const pages = context.pages();
        // Server 2 is on https://open.rocket.chat
        webviewPage2 = pages.find((page: any) => page.url().includes('open.rocket.chat')) || null;

        if (!webviewPage2) {
          await new Promise(resolve => setTimeout(resolve, 1000));
          attempts2++;
        }
      }

      if (!webviewPage2) {
        throw new Error('Server 2 webview (open.rocket.chat) not found after 60 seconds');
      }

      console.log(`✓ Found server 2 webview after ${attempts2} attempts: ${webviewPage2.url()}`);

      console.log('🏠 Waiting for Home button to appear on server 2...');
      await webviewPage2.waitForSelector('button[title="Home"]', { timeout: 60000 });
      console.log('✓ Home button found on server 2');

      console.log('🏠 Clicking Home button on server 2...');
      await webviewPage2.click('button[title="Home"]');
      await new Promise(resolve => setTimeout(resolve, 2000));

      console.log('⏳ Waiting for sandbox channel to appear...');
      await webviewPage2.waitForSelector('a[href="/channel/sandbox"]', { timeout: 60000 });
      console.log('✓ sandbox channel found');

      console.log('📝 Navigating to sandbox channel...');
      await webviewPage2.click('a[href="/channel/sandbox"]');
      await new Promise(resolve => setTimeout(resolve, 2000));

      console.log('✍️  Typing "Testing Message 2"...');
      const textarea2 = await webviewPage2.waitForSelector('textarea[name="msg"]', { timeout: 10000 });
      await textarea2.fill('Testing Message 2');
      await webviewPage2.waitForSelector('button[aria-label="Send"]:not([disabled])', { timeout: 5000 });
      await webviewPage2.click('button[aria-label="Send"]');
      console.log('✓ Sent "Testing Message 2" in sandbox channel');
      await new Promise(resolve => setTimeout(resolve, 2000));

      // SERVER 1 - Third message
      console.log(`\n🖱️  Switching back to first server (Button ${firstServer.index})...`);
      await firstServer.button.click();
      await new Promise(resolve => setTimeout(resolve, 3000));

      console.log('⏳ Waiting for Testing2 channel to appear...');
      await webviewPage.waitForSelector('a[href="/channel/Testing2"]', { timeout: 60000 });
      console.log('✓ Testing2 channel found');

      console.log('📝 Navigating to Testing2 channel...');
      await webviewPage.click('a[href="/channel/Testing2"]');
      await new Promise(resolve => setTimeout(resolve, 2000));

      console.log('✍️  Typing "Testing Message 3"...');
      const textarea3 = await webviewPage.waitForSelector('textarea[name="msg"]', { timeout: 10000 });
      await textarea3.fill('Testing Message 3');
      await webviewPage.waitForSelector('button[aria-label="Send"]:not([disabled])', { timeout: 5000 });
      await webviewPage.click('button[aria-label="Send"]');
      console.log('✓ Sent "Testing Message 3" in Testing2 channel');
      await new Promise(resolve => setTimeout(resolve, 2000));

      console.log('\n✓ Successfully switched between servers and sent messages');
    } else {
      throw new Error(`Not enough servers found (found ${serverButtons.length}, need at least 2). Please ensure at least 2 servers are configured before running this test.`);
    }

    console.log('\n🔒 Closing app...');
    await electronApp.close();
    console.log('✓ Test completed successfully');
  });
});
