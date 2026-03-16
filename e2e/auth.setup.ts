import { expect, test as setup } from './fixtures/base';
import path from 'path';

const authFile = path.join(__dirname, '../playwright/.auth/user.json');

setup('Login to Rocket.Chat Workspace', async ({ webviewPage }) => {
    setup.setTimeout(90000);

    // 1. Navigate to Rocket.Chat login page
    console.log('\n>> Navigating to http://localhost:3000 ...');
    await webviewPage.goto('http://localhost:3000');
    console.log('✓ Login page opened');

    // 2. Wait for username/email field
    console.log('\n⏳ Waiting for username/email input...');
    await webviewPage.waitForSelector('input[name="usernameOrEmail"]', { timeout: 30000 });
    console.log('✓ Username/email input found');

    // 3. Enter username "santam"
    console.log('\n>> Typing username "santam"...');
    await webviewPage.fill('input[name="usernameOrEmail"]', 'santam');
    console.log('✓ Username entered');

    // 4. Wait for password field
    console.log('\n⏳ Waiting for password input...');
    await webviewPage.waitForSelector('input[name="password"]', { timeout: 10000 });
    console.log('✓ Password input found');

    // 5. Enter password
    console.log('\n>> Typing password...');
    await webviewPage.fill('input[name="password"]', 'SayMyName123***');
    console.log('✓ Password entered');

    // 6. Wait for Login button
    console.log('\n⏳ Waiting for Login button...');
    await webviewPage.waitForSelector('button[type="submit"]', { timeout: 10000 });
    console.log('✓ Login button found');

    // 7. Click Login button
    console.log('\n>> Clicking Login button...');
    await webviewPage.click('button[type="submit"]');
    console.log('✓ Login button clicked');

    // 8. Wait for navigation after login
    console.log('\n⏳ Waiting for workspace to load...');
    await new Promise(resolve => setTimeout(resolve, 3000));
    console.log('✓ Workspace loaded');

    // 9. Verify successful login by checking URL
    console.log('\n⏳ Verifying login success...');
    await expect(webviewPage).toHaveURL(/home|channel|workspace/);
    console.log('✓ Login successful');

    console.log('\n✓ Test completed successfully');

  await webviewPage.context().storageState({ path: authFile });
});