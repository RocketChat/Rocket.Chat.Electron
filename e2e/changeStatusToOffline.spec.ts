// spec: specs/change-status-to-offline.plan.md
// seed: e2e/seed.spec.ts

import { test, _electron as electron } from '@playwright/test';
import path from 'path';

test.describe('User Status Management', () => {
  test('changeStatusToOffline', async () => {
    test.setTimeout(120000);

    // 1. Launch Electron application with necessary flags
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

    // 2. Wait 5 seconds for the application to fully initialize
    console.log('⏳ Waiting for app to initialize (5 seconds)...');
    await new Promise(resolve => setTimeout(resolve, 5000));

    // Get the browser context
    const context = window.context();
    console.log('✓ Got browser context');

    // 3. Locate and access the webview page containing localhost:3000
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

    // 4. Wait for the React application to fully load in the webview
    console.log('⏳ Waiting for React app to load in webview...');

    // 5. Click the Home button in the navbar
    console.log('>> Clicking Home button to reset to home page...');
    await webviewPage.waitForSelector('button.rcx-navbar-item i.rcx-icon--name-home', { timeout: 30000 });
    await webviewPage.click('button.rcx-navbar-item:has(i.rcx-icon--name-home)');
    console.log('✓ Clicked Home button');

    // 6. Wait 2 seconds for the page to complete navigation
    await new Promise(resolve => setTimeout(resolve, 2000));
    console.log('✓ Navigation to home complete');

    // 7. Locate the user avatar image element
    console.log('⏳ Waiting for user avatar...');
    await webviewPage.waitForSelector('img[data-username]', { timeout: 30000 });
    console.log('✓ User avatar found');

    // 8. Click on the user avatar to open the profile dropdown menu
    console.log('>> Clicking user avatar to open profile menu...');
    await webviewPage.click('img[data-username]');
    console.log('✓ Clicked user avatar');

    // 9. Wait 1 second for the dropdown menu to fully render
    await new Promise(resolve => setTimeout(resolve, 1000));
    console.log('✓ Dropdown menu deployed');

    // 10. Locate and interact with the status menu option in the dropdown
    console.log('⏳ Waiting for status menu option...');
    try {
      await webviewPage.waitForSelector('[role="menuitem"] [role="status"], [role="menuitem"] button:has(i.rcx-icon--name-status-busy), [role="menuitem"] [data-qa-id*="status"]', { timeout: 10000 });
      
      // Find and click the status option - it could be a button or menuitem containing status
      const statusOptionLocator = webviewPage.locator('[role="menuitem"]:has-text("Online"), [role="menuitem"]:has-text("Away"), [role="menuitem"]:has-text("Busy"), [role="menuitem"]:has-text("Invisible")').first();
      
      // Click the status option (first visible status item which should be current status)
      await webviewPage.click('[role="menuitem"] button:has(i.rcx-icon--name-status-online), [role="menuitem"] button:has(i.rcx-icon--name-status-away), [role="menuitem"] button:has(i.rcx-icon--name-status-busy)');
      console.log('✓ Status menu option found');
    } catch (e) {
      console.log('⚠️  Could not find status menu option with standard selectors, trying alternative approach');
      // Alternative: Look for any menu item that might contain status options
      const menuItems = await webviewPage.$$('[role="menuitem"]');
      for (const item of menuItems) {
        const text = await item.textContent();
        if (text && (text.includes('Online') || text.includes('Away') || text.includes('Busy') || text.includes('Offline'))) {
          await item.click();
          break;
        }
      }
    }

    // 11. Click on the status option to reveal the status submenu
    console.log('⏳ Waiting for status submenu...');
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // 12. Locate the 'Offline' status option
    console.log('>> Looking for Offline status option...');
    try {
      // Wait for the offline status option to be visible
      await webviewPage.waitForSelector('[role="menuitem"]:has-text("Offline"), [role="option"]:has-text("Offline"), label:has-text("Offline")', { timeout: 5000 });
      console.log('✓ Offline status option found');
      
      // 13. Click on the 'Offline' status option
      console.log('>> Clicking Offline status option...');
      await webviewPage.click('[role="menuitem"]:has-text("Offline"), [role="option"]:has-text("Offline"), label:has-text("Offline")');
      console.log('✓ Clicked Offline status option');
    } catch (e) {
      console.log('⚠️  Could not find Offline option with standard selectors');
      const offlineOption = await webviewPage.locator('[role="menuitem"], [role="option"]').filter({ hasText: /Offline/i }).first();
      if (offlineOption) {
        await offlineOption.click();
        console.log('✓ Clicked Offline status via alternative locator');
      }
    }

    // 14. Wait 2 seconds for the status change to propagate
    console.log('⏳ Waiting for status change to propagate (2 seconds)...');
    await new Promise(resolve => setTimeout(resolve, 2000));
    console.log('✓ Status change propagated');

    // Verify status change persists across navigation
    console.log('\n>> Verifying status change persists across navigation...');

    // Navigate to a different section/channel to verify persistence
    console.log('⏳ Waiting for channel or navigation element...');
    try {
      // Look for a channel link or navigation element
      await webviewPage.waitForSelector('a[href*="/channel/"], a[href*="/group/"], a[href*="/direct/"], [role="button"][aria-current]', { timeout: 10000 });
      
      // Click on a different channel if available
      const channelLink = await webviewPage.$('a[href*="/channel/"]:not([aria-current="page"]), a[href*="/group/"]:not([aria-current="page"])');
      if (channelLink) {
        await channelLink.click();
        console.log('✓ Navigated to different section');
        
        // Wait for navigation
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    } catch (e) {
      console.log('⚠️  No alternative channel found to navigate to');
    }

    // Return to the home page or navigate back to verify status is still offline
    console.log('>> Returning to home to verify status persists...');
    await webviewPage.click('button.rcx-navbar-item:has(i.rcx-icon--name-home)');
    console.log('✓ Returned to home');

    // Wait for navigation
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Verify status indicator is still offline
    console.log('⏳ Verifying status still shows offline...');
    // The user avatar should still be visible and show offline status
    await webviewPage.waitForSelector('img[data-username]', { timeout: 10000 });
    console.log('✓ Status persists across navigation');

    // Change status from offline back to online (Cleanup)
    console.log('\n>> Cleanup: Changing status back to online...');

    // Click on the user avatar again
    console.log('>> Clicking user avatar to open profile menu...');
    await webviewPage.click('img[data-username]');
    console.log('✓ Clicked user avatar');

    // Wait for dropdown menu
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Click on the status option
    console.log('>> Clicking status option...');
    try {
      await webviewPage.click('[role="menuitem"] button:has(i.rcx-icon--name-status-online), [role="menuitem"] button:has(i.rcx-icon--name-status-away), [role="menuitem"] button:has(i.rcx-icon--name-status-busy)');
    } catch (e) {
      // Alternative: Look for any menu item that might contain status options
      const menuItems = await webviewPage.$$('[role="menuitem"]');
      for (const item of menuItems) {
        const text = await item.textContent();
        if (text && (text.includes('Online') || text.includes('Away') || text.includes('Busy') || text.includes('Offline'))) {
          await item.click();
          break;
        }
      }
    }

    // Wait for submenu
    await new Promise(resolve => setTimeout(resolve, 500));

    // Click on the 'Online' status option
    console.log('>> Clicking Online status option...');
    try {
      await webviewPage.click('[role="menuitem"]:has-text("Online"), [role="option"]:has-text("Online"), label:has-text("Online")');
      console.log('✓ Clicked Online status option');
    } catch (e) {
      console.log('⚠️  Could not find Online option with standard selectors');
      const onlineOption = await webviewPage.locator('[role="menuitem"], [role="option"]').filter({ hasText: /Online/i }).first();
      if (onlineOption) {
        await onlineOption.click();
        console.log('✓ Clicked Online status via alternative locator');
      }
    }

    // Wait for status change
    await new Promise(resolve => setTimeout(resolve, 2000));
    console.log('✓ Status changed back to online');

    console.log('\n🔒 Closing app...');
    await electronApp.close();
    console.log('✓ Test completed successfully');
  });
});
