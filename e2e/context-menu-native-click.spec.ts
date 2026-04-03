import { test } from './fixtures/base';
import { mouse, clipboard, keyboard, Key } from '@nut-tree-fork/nut-js';

test.describe('Context Menu Native Click', () => {
  test('should click Paste from native context menu using keyboard navigation', async ({ electronApp, webviewPage }) => {
    test.setTimeout(120000);

    // 1. Copy to clipboard
    await clipboard.setContent('Santam Test');
    console.log('✓ Copied "Santam Test" to clipboard');

    // 2. Navigate to Testing2
    await webviewPage.waitForSelector('a[href="/channel/Testing2"]', { timeout: 30000 });
    await webviewPage.click('a[href="/channel/Testing2"]');
    await new Promise(resolve => setTimeout(resolve, 2000));

    // 3. Focus textarea and clear it
    const textarea = await webviewPage.waitForSelector('textarea[name="msg"][aria-label="Message #Testing2"]', { timeout: 10000 });
    await webviewPage.click('textarea[name="msg"][aria-label="Message #Testing2"]');
    await new Promise(resolve => setTimeout(resolve, 500));

    // Clear any existing text
    await webviewPage.fill('textarea[name="msg"][aria-label="Message #Testing2"]', '');
    console.log('✓ Textarea focused and cleared');

    // 4. Get coordinates
    const textareaBox = await textarea.boundingBox();
    if (!textareaBox) throw new Error('No bounding box');

    const windowBounds = await electronApp.evaluate(async ({ BrowserWindow }) => {
      const windows = BrowserWindow.getAllWindows();
      if (windows.length > 0) {
        return windows[0].getContentBounds();
      }
      return { x: 0, y: 0, width: 0, height: 0 };
    });

    const absoluteX = Math.round(windowBounds.x + textareaBox.x + textareaBox.width / 2);
    const absoluteY = Math.round(windowBounds.y + textareaBox.y + textareaBox.height / 2);

    // 5. Right-click using nut-js
    console.log('\n>> Right-clicking on textarea...');
    await mouse.setPosition({ x: absoluteX, y: absoluteY });
    await new Promise(resolve => setTimeout(resolve, 500));
    await mouse.rightClick();
    console.log('✓ Context menu opened');

    // Wait for menu to fully appear
    await new Promise(resolve => setTimeout(resolve, 1000));

    console.log('\n>> Navigating to Paste using Down arrow keys...');

    // Press Down 2 times to reach Paste
    // Menu structure: [Spelling suggestion] -> [Another option] -> Paste
    for (let i = 0; i < 2; i++) {
      await keyboard.type(Key.Down);
      await new Promise(resolve => setTimeout(resolve, 150));
      console.log(`   Pressed Down (${i + 1}/2)`);
    }

    // Press Enter to click Paste
    console.log('\n>> Pressing Enter to click Paste...');
    await keyboard.type(Key.Return);
    console.log('✓ Pressed Enter');

    // Wait for paste to complete
    await new Promise(resolve => setTimeout(resolve, 1000));

    // 7. Verify paste worked
    const textareaValue = await webviewPage.inputValue('textarea[name="msg"][aria-label="Message #Testing2"]');
    console.log('✓ Textarea value after paste:', textareaValue);

    if (!textareaValue.includes('Santam Test')) {
      throw new Error(`Native menu paste failed. Expected text to include "Santam Test", got "${textareaValue}"`);
    }

    console.log('Paste successful - "Santam Test" found in textarea');

    // 8. Send the message
    console.log('\n>> Sending the pasted message...');
    await webviewPage.waitForSelector('button[aria-label="Send"]:not([disabled])', { timeout: 5000 });
    await webviewPage.click('button[aria-label="Send"]');
    console.log('✓ Message sent successfully');

    await new Promise(resolve => setTimeout(resolve, 2000));
    console.log('\n Test completed - Native context menu Paste clicked successfully!');
  });
});
