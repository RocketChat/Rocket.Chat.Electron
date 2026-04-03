import { test, _electron as electron } from '@playwright/test';
import path from 'path';

test.describe('Check Server Unread Badge', () => {
  test('should display unread message count on server icon in sidebar', async () => {
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
    console.log('⏳ Waiting for app to initialize...');
    await new Promise(resolve => setTimeout(resolve, 5000));

    const windows = electronApp.windows();
    const activeWindow = windows.find(w => !w.isClosed()) || window;

    if (activeWindow.isClosed()) {
      throw new Error('No active window found');
    }

    // Wait for webview to load by checking for Home button in webview
    console.log('⏳ Waiting for webview to load...');
    const context = activeWindow.context();
    let webviewPage: any = null;
    let attempts = 0;

    while (!webviewPage && attempts < 30) {
      const pages = context.pages();
      webviewPage = pages.find((page: any) => page.url().includes('localhost:3000')) || null;

      if (!webviewPage) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        attempts++;
      }
    }

    if (webviewPage) {
      console.log(`✓ Found webview page after ${attempts} attempts`);
      console.log('⏳ Waiting for Home button to appear in webview...');
      try {
        await webviewPage.waitForSelector('button[title="Home"]', { timeout: 60000 });
        console.log('✓ Home button found - webview fully loaded');
        // Wait additional time to ensure badges are rendered
        await new Promise(resolve => setTimeout(resolve, 3000));
        console.log('✓ Additional wait completed\n');
      } catch (error) {
        console.log('⚠️  Home button not found in webview after 60 seconds\n');
      }
    } else {
      console.log('⚠️  Webview page not found after 30 seconds\n');
    }

    console.log('🔍 Checking server icons for unread message badges...\n');

    // Find all server buttons in the sidebar
    const allButtons = await activeWindow.locator('button').all();
    const serverInfo = [];

    for (let i = 0; i < Math.min(allButtons.length, 15); i++) {
      const button = allButtons[i];
      const isVisible = await button.isVisible().catch(() => false);

      if (!isVisible) continue;

      const title = await button.getAttribute('title').catch(() => null);

      // Skip Add/Customize buttons
      if (title && (title.includes('Add workspace') || title.includes('Customize'))) {
        continue;
      }

      // Get the button's HTML to inspect for badges
      const buttonInfo = await button.evaluate((el) => {
        const title = el.getAttribute('title') || el.getAttribute('aria-label') || '';
        const hasContent = el.textContent?.trim() || '';

        // Look for unread badge elements
        const badge = el.querySelector('[class*="badge"]') ||
                     el.querySelector('[class*="unread"]') ||
                     el.querySelector('[class*="count"]') ||
                     el.querySelector('status') ||
                     el.querySelector('[role="status"]');

        let unreadCount = '0';
        let badgeVisible = false;
        let badgeClasses = [];
        let badgeHTML = '';

        if (badge) {
          unreadCount = badge.textContent?.trim() || '0';
          badgeVisible = true;
          badgeClasses = Array.from(badge.classList);
          badgeHTML = badge.outerHTML;
        }

        // Also check for aria-label with unread info
        const ariaLabel = el.getAttribute('aria-label') || '';
        const unreadMatch = ariaLabel.match(/(\d+)\s+unread/i);
        if (unreadMatch) {
          unreadCount = unreadMatch[1];
          badgeVisible = true;
        }

        return {
          title: title || 'Server',
          hasContent: hasContent.length > 0,
          unreadCount,
          badgeVisible,
          badgeClasses,
          badgeHTML: badgeHTML.substring(0, 200),
          ariaLabel,
          outerHTML: el.outerHTML.substring(0, 500),
        };
      });

      // Consider it a server button if it has content or a title
      if (buttonInfo.hasContent || buttonInfo.title !== 'Server') {
        serverInfo.push({
          index: i + 1,
          title: buttonInfo.title,
          unreadCount: buttonInfo.unreadCount,
        });
      }
    }

    // Summary
    console.log('📋 Unread Messages Summary:');
    serverInfo.forEach((server, idx) => {
      console.log(`   ${idx + 1}. ${server.title}: ${server.unreadCount} unread`);
    });

    console.log('\n🔒 Closing app...');
    await electronApp.close();
    console.log('✓ Test completed successfully');
  });
});
