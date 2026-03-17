// spec: specs/create-public-channel-dummy.md
// seed: e2e/seed.spec.ts

import { test, expect } from './fixtures/base';

test.describe('Creating a Public Channel', () => {
  test('Create Public Channel Named "Dummy"', async ({ webviewPage }) => {
    // Step 1: Navigate to Home Page
    await webviewPage.goto('http://localhost:3000/home');
    await webviewPage.waitForLoadState('networkidle');

    // Step 2: Open Channel Creation Dialog
    await webviewPage.getByRole('button', { name: 'Create channel' }).click();
    await expect(webviewPage.getByRole('dialog', { name: 'Create channel' })).toBeVisible();

    // Step 3: Enter Channel Name
    await webviewPage.getByRole('textbox', { name: 'Name' }).fill('Dummy');

    // Step 4: Verify Private Checkbox is Checked by Default
    const privateCheckbox = webviewPage.getByRole('checkbox', { name: 'Private' });
    await expect(privateCheckbox).toBeChecked();
    await expect(webviewPage.getByText('People can only join by being invited')).toBeVisible();

    // Step 5: Uncheck Private Checkbox to Make Channel Public
    await webviewPage.evaluate(() => {
      document.querySelector('label.rcx-toggle-switch')?.click();
    });
    await expect(privateCheckbox).not.toBeChecked();
    await expect(webviewPage.getByText('Anyone can access')).toBeVisible();

    // Step 8: Submit the Form
    await webviewPage.getByRole('button', { name: 'Create', exact: true }).click();

    // Verification 1: Confirm Navigation to Channel Page
    await expect(webviewPage).toHaveURL('http://localhost:3000/channel/Dummy');

    // Verification 2: Confirm Success Alert
    const successAlert = webviewPage.getByRole('alert');
    await expect(successAlert).toContainText('Room has been created');

    // Verification 3: Confirm Channel Appears in Sidebar
    const channelLink = webviewPage.getByRole('link', { name: 'Dummy' });
    await expect(channelLink).toBeVisible();
    
    // Verify it's in the channels list (first item)
    const channelsList = webviewPage.getByRole('list', { name: 'Channels' });
    await expect(channelLink).toBe(channelsList.locator('a').first());

    // Verification 4: Confirm Channel Header
    const channelHeading = webviewPage.getByRole('heading', { name: 'Dummy', level: 1 });
    await expect(channelHeading).toBeVisible();

    // Verification 6: Message Compose Area Visible
    const messageInput = webviewPage.getByRole('textbox', { name: /Message #Dummy/ });
    await expect(messageInput).toBeVisible();
    await expect(messageInput).toBeFocused();
  });
});
