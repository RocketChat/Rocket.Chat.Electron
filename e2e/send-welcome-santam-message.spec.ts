// spec: specs/santam-test.md
import { test } from './fixtures/base';

test.describe('Send "Welcome Santam" Message to Testing2 Channel', () => {
  test('Send "Welcome Santam" Message', async ({ webviewPage }) => {
    test.setTimeout(90000);

    // 1. Locate Testing2 channel link
    await webviewPage.waitForSelector('a[href="/channel/Testing2"]', { timeout: 30000 });
    console.log('✓ Testing2 channel link found');

    // 2. Click on Testing2 channel
    console.log('\n>> Clicking Testing2 channel...');
    await webviewPage.click('a[href="/channel/Testing2"]');
    console.log('✓ Clicked Testing2 channel');

    // 3. Wait for channel to load
    await new Promise(resolve => setTimeout(resolve, 2000));
    console.log('✓ Testing2 channel loaded');
    console.log('✓ Current URL:', webviewPage.url());

    // 4. Wait for message textarea to appear
    console.log('\n⏳ Waiting for message textarea...');
    await webviewPage.waitForSelector('textarea[name="msg"][aria-label="Message #Testing2"]', { timeout: 10000 });
    console.log('✓ Message textarea found');

    // 5. Click on message textarea to focus
    console.log('\n>> Clicking message textarea to focus...');
    await webviewPage.click('textarea[name="msg"][aria-label="Message #Testing2"]');
    console.log('✓ Message textarea focused');

    // 6. Type "Welcome Santam" exactly (using fill instead of deprecated type)
    console.log('\n>> Typing "Welcome Santam"...');
    await webviewPage.fill('textarea[name="msg"][aria-label="Message #Testing2"]', 'Welcome Santam');
    console.log('✓ Typed "Welcome Santam"');

    // 7. Wait for UI to update (500ms)
    await new Promise(resolve => setTimeout(resolve, 500));
    console.log('✓ UI updated');

    // 8. Wait for Send button to be enabled
    console.log('\n⏳ Waiting for Send button to be enabled...');
    await webviewPage.waitForSelector('button[aria-label="Send"]:not([disabled])', { timeout: 5000 });
    console.log('✓ Send button is enabled');

    // 9. Click the Send button
    console.log('\n>> Clicking Send button...');
    await webviewPage.click('button[aria-label="Send"]');
    console.log('✓ Clicked Send button');

    // 10. Wait for message delivery (2 seconds)
    await new Promise(resolve => setTimeout(resolve, 2000));
    console.log('✓ Message "Welcome Santam" sent successfully');
  });
});
