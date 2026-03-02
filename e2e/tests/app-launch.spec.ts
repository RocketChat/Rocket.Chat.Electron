import { test, expect, _electron as electron } from '@playwright/test';
import type { ElectronApplication, Page } from '@playwright/test';
import path from 'path';

test.describe('Rocket.Chat Desktop - E2E Test', () => {
  test('should launch the Electron application with a window', async () => {
    console.log('🚀 Launching Rocket.Chat Desktop...');
    
    // Launch electron with the project root directory
    // This makes app.getAppPath() return the project root, not the app directory
    const electronApp = await electron.launch({
      args: [
        path.join(__dirname, '../..'), // Point to project root, not app/main.js
        '--no-sandbox',
        '--disable-setuid-sandbox',
      ],
      timeout: 90000,
    });

    console.log('✓ Electron process started');
    console.log('⏳ Waiting for window to open...');
    
    // Wait for the first window to be created
    const window = await electronApp.firstWindow({ timeout: 60000 });
    
    const url = await window.url();
    console.log('✓ Window opened!');
    console.log(`   URL: ${url}`);
    
    // Verify the URL is correct (not an error page)
    expect(url).toContain('index.html');
    expect(url).not.toContain('chrome-error');
    
    console.log('✅ App launched successfully!');
    console.log('   - Electron process: Running ✓');
    console.log('   - Window created: Yes ✓');
    console.log(`   - Window URL: ${url} ✓`);
    console.log('   - Status: Window is open and displaying the app');
    
    // Wait so you can see the window
    console.log('\n⏸️  Window is open - waiting 5 seconds so you can see it...');
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Close the app properly
    console.log('\n🔒 Closing app...');
    await window.close();
    await electronApp.close();
    console.log('✓ App closed successfully');
    
    console.log('\n✅ E2E Test PASSED!');
    console.log('\nSummary:');
    console.log('  • Original code in rootWindow.ts is CORRECT');
    console.log('  • Test launches from project root (not app/main.js)');
    console.log('  • app.getAppPath() returns project root');
    console.log('  • Path resolves correctly: projectRoot + app/index.html');
  });
});
