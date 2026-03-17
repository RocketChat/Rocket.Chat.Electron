import { test, _electron as electron } from '@playwright/test';
import path from 'path';

test.describe('Open and Close Electron App', () => {
  test('should open and close the Electron app', async () => {
    test.setTimeout(90000);

    const electronApp = await electron.launch({
      args: [
        path.join(__dirname, '..','..'),
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

    console.log('\n🔒 Closing app...');
    await electronApp.close();
    console.log('✓ Test completed successfully');
  });
});
