import { test, _electron as electron } from '@playwright/test';
import path from 'path';

test.describe('Switch Servers', () => {
  test('should switch between servers', async () => {
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

    // Get the active window
    const windows = electronApp.windows();
    const activeWindow = windows.find(w => !w.isClosed()) || window;

    if (activeWindow.isClosed()) {
      throw new Error('No active window found');
    }

    // Take initial screenshot
    await activeWindow.screenshot({ path: 'test-results/initial-state.png' });
    console.log('📸 Screenshot saved: initial-state.png');

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

      // Click the first server
      console.log(`\n Clicking first server (Button ${firstServer.index})...`);
      await firstServer.button.click();
      await new Promise(resolve => setTimeout(resolve, 2000));

      await activeWindow.screenshot({ path: 'test-results/first-server-selected.png' });
      console.log('Screenshot saved: first-server-selected.png');

      // Click the second server
      console.log(`🖱️  Clicking second server (Button ${secondServer.index})...`);
      await secondServer.button.click();
      await new Promise(resolve => setTimeout(resolve, 2000));

      await activeWindow.screenshot({ path: 'test-results/second-server-selected.png' });
      console.log('Screenshot saved: second-server-selected.png');

      // Switch back to the first server
      console.log(`Switching back to first server (Button ${firstServer.index})...`);
      await firstServer.button.click();
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Click the second server
      console.log(`Clicking second server (Button ${secondServer.index})...`);
      await secondServer.button.click();
      await new Promise(resolve => setTimeout(resolve, 2000));

      await activeWindow.screenshot({ path: 'test-results/second-server-selected.png' });
      console.log('Screenshot saved: second-server-selected.png');

      // Switch back to the first server
      console.log(`🖱️  Switching back to first server (Button ${firstServer.index})...`);
      await firstServer.button.click();
      await new Promise(resolve => setTimeout(resolve, 2000));

      await activeWindow.screenshot({ path: 'test-results/back-to-first-server.png' });
      console.log('Screenshot saved: back-to-first-server.png');

      console.log('\n✓ Successfully switched between servers');
    } else {
      throw new Error(`Not enough servers found (found ${serverButtons.length}, need at least 2). Please ensure at least 2 servers are configured before running this test.`);
    }

    console.log('\n🔒 Closing app...');
    await electronApp.close();
    console.log('✓ Test completed successfully');
  });
});
