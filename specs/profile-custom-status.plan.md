# Profile Custom Status Test Plan

## Application Overview

This test plan covers comprehensive scenarios for accessing user profile and creating/saving custom status messages in Rocket.Chat Electron desktop application. The feature allows users to set a personalized status message that displays to other users in the workspace.

## Test Scenarios

### 1. Profile Custom Status - Happy Path

**Seed:** `e2e/seed.spec.ts`

#### 1.1. Create a simple custom status

**File:** `tests/profile/create-simple-custom-status.spec.ts`

**Steps:**
  1. Launch the Rocket.Chat Electron application
    - expect: Electron process starts successfully
    - expect: Application window is visible
  2. Wait for the webview page to load (localhost:3000)
    - expect: WebView page loads within 30 seconds
  3. Wait 5 seconds for the application to fully initialize
    - expect: React app is fully loaded in webview
  4. Click the Home button (navbar with home icon) to ensure we're on the home page
    - expect: Home page is displayed
  5. Click on the user avatar (profile image with data-username attribute)
    - expect: User dropdown menu appears
    - expect: Menu contains profile and status related options
  6. Click on 'My Profile' or 'Profile' option from the dropdown menu
    - expect: Profile page loads
    - expect: User information is displayed
  7. Locate the custom status field on the profile page
    - expect: Status input field is visible
    - expect: Field is empty or shows current status
  8. Click on the custom status input field
    - expect: Input field is focused
    - expect: Cursor is positioned in the field
  9. Type a custom status message: 'Available for chat'
    - expect: Text appears in the status field
    - expect: No validation errors are shown
  10. Locate and click the 'Save' or 'Save Profile' button
    - expect: Save button is enabled
    - expect: Save button receives focus
  11. Confirm save action if prompted with a dialog
    - expect: Status is saved successfully
    - expect: Success message appears (if applicable)
  12. Navigate away from the profile page and return to verify the status persists
    - expect: Custom status 'Available for chat' is still displayed
    - expect: Status has been saved to the profile

#### 1.2. Create custom status with special characters and emoji

**File:** `tests/profile/create-custom-status-with-emoji.spec.ts`

**Steps:**
  1. Launch the Rocket.Chat Electron application
    - expect: Application launches successfully
  2. Wait for webview to load and initialize (wait 5 seconds total)
    - expect: WebView page is loaded
  3. Navigate to home page by clicking Home button
    - expect: Home page is displayed
  4. Click user avatar to open dropdown menu
    - expect: User menu dropdown appears
  5. Navigate to Profile by clicking 'My Profile' option
    - expect: Profile page loads
  6. Click on the custom status input field
    - expect: Input field is focused and ready for input
  7. Type custom status with emoji: '🚀 Working on something awesome'
    - expect: Emoji and text appear correctly in the input field
    - expect: Field handles emoji without errors
  8. Add additional special characters: '@Company - Focused 💼'
    - expect: Special characters (@) display correctly
    - expect: Multiple emoji render without issues
  9. Click Save button to save the status
    - expect: Status with emoji and special characters saves successfully
  10. Close and reopen profile to verify emoji status persists
    - expect: Custom status with emoji is displayed as saved
    - expect: No character encoding issues

#### 1.3. Update existing custom status

**File:** `tests/profile/update-existing-custom-status.spec.ts`

**Steps:**
  1. Launch application and navigate to profile (following standard setup steps)
    - expect: Profile page is accessible and current status is visible
  2. View existing custom status (assume 'Available for chat' is already saved)
    - expect: Previous custom status is displayed in the status field
  3. Click on the status input field to select it
    - expect: Input field receives focus
    - expect: Text can be edited
  4. Select all text in the status field (Ctrl+A or Cmd+A)
    - expect: All text in the field is highlighted
  5. Type a new custom status: 'In a meeting - Do not disturb'
    - expect: New text replaces the previous status
    - expect: Only the new status text is visible
  6. Click Save button
    - expect: New custom status is saved
    - expect: Previous status is replaced
  7. Verify the status has been updated by navigating back to profile
    - expect: New status 'In a meeting - Do not disturb' is displayed
    - expect: Previous status is no longer shown

#### 1.4. Clear custom status

**File:** `tests/profile/clear-custom-status.spec.ts`

**Steps:**
  1. Navigate to profile page with existing custom status
    - expect: Profile page shows current custom status
  2. Click on the custom status input field
    - expect: Status input is focused
  3. Select all status text and delete it (Ctrl+A, then Delete/Backspace)
    - expect: Status field is now empty
  4. Click Save button to save the empty status
    - expect: Empty status is saved successfully
  5. Verify status has been cleared by navigating away and back to profile
    - expect: Status field is empty
    - expect: No custom status is displayed

### 2. Profile Custom Status - Edge Cases

**Seed:** `e2e/seed.spec.ts`

#### 2.1. Custom status with maximum character limit

**File:** `tests/profile/max-character-status.spec.ts`

**Steps:**
  1. Navigate to profile page
    - expect: Profile page is accessible
  2. Click on custom status input field
    - expect: Input field is focused
  3. Attempt to type a very long custom status message exceeding typical character limits
    - expect: Application enforces character limit
    - expect: Excess characters are either truncated or prevented from entry
    - expect: User receives feedback about character limit
  4. Click Save button
    - expect: Status saves with appropriate character limit enforced
  5. Verify saved status respects the character limit
    - expect: Saved status does not exceed maximum length

#### 2.2. Custom status with HTML/Script tags

**File:** `tests/profile/status-with-html-tags.spec.ts`

**Steps:**
  1. Navigate to profile page
    - expect: Profile page is loaded
  2. Click on custom status input field
    - expect: Input field is focused
  3. Attempt to type a status containing HTML tags: '<script>alert("test")</script>'
    - expect: HTML/script tags are either escaped or sanitized
    - expect: No script execution occurs
  4. Click Save button
    - expect: Status saves safely without executing any code
  5. Verify status is displayed as plain text, not as executable code
    - expect: HTML tags are displayed as text
    - expect: No security vulnerabilities are present

#### 2.3. Rapid save attempts - Save button responsiveness

**File:** `tests/profile/rapid-save-attempts.spec.ts`

**Steps:**
  1. Navigate to profile page
    - expect: Profile page is loaded
  2. Click on custom status input field and type a status
    - expect: Status text is entered
  3. Click Save button immediately, then click it again rapidly (within 500ms)
    - expect: Save button handles rapid clicks gracefully
    - expect: Status is saved once (no duplicate saves)
    - expect: No error messages appear
  4. Wait for save to complete and verify status is saved exactly once
    - expect: Status appears only once
    - expect: No duplicate entries or errors in the profile

#### 2.4. Save status during network latency

**File:** `tests/profile/save-with-network-delay.spec.ts`

**Steps:**
  1. Navigate to profile page
    - expect: Profile page is ready
  2. Enter a custom status: 'Testing network delay'
    - expect: Status text is entered
  3. Click Save button and observe the save behavior during any network latency
    - expect: Save button shows loading state (spinner or disabled state)
    - expect: User receives feedback that save is in progress
  4. Wait for save to complete
    - expect: Status saves successfully despite network delay
    - expect: Confirmation message appears

### 3. Profile Custom Status - Error Scenarios

**Seed:** `e2e/seed.spec.ts`

#### 3.1. Handle save failure gracefully

**File:** `tests/profile/save-failure-handling.spec.ts`

**Steps:**
  1. Navigate to profile page
    - expect: Profile page is displayed
  2. Enter a custom status message
    - expect: Status text is entered
  3. Intentionally simulate a save failure or disconnect from network
    - expect: Save attempt is made
  4. Observe error handling
    - expect: Error message is displayed to user
    - expect: Status is not lost (still visible in input field)
    - expect: User can retry saving
  5. Click Save again after network is restored
    - expect: Save completes successfully on retry

#### 3.2. Cancel profile changes without saving

**File:** `tests/profile/cancel-profile-changes.spec.ts`

**Steps:**
  1. Navigate to profile page with existing status
    - expect: Profile page loads with current status
  2. Click on custom status input and modify it to a new value
    - expect: New status text is visible in the input field
  3. Click Cancel button or navigate away without clicking Save
    - expect: User is prompted if there are unsaved changes
    - expect: OR changes are automatically discarded
  4. Navigate back to profile
    - expect: Original status is restored
    - expect: Changes were not saved

#### 3.3. Profile page fails to load

**File:** `tests/profile/profile-load-failure.spec.ts`

**Steps:**
  1. Launch application and attempt to navigate to profile
    - expect: Navigation is attempted
  2. If profile page fails to load, observe the error state
    - expect: Error message is displayed
    - expect: User is offered options to retry or return to home
  3. Click Retry button if available
    - expect: Profile page loads successfully on retry

### 4. Profile Custom Status - UI/UX

**Seed:** `e2e/seed.spec.ts`

#### 4.1. Verify custom status field placeholder text

**File:** `tests/profile/status-field-placeholder.spec.ts`

**Steps:**
  1. Navigate to profile page
    - expect: Profile page loads
  2. Locate the custom status input field
    - expect: Status field is visible
  3. Verify that the input field displays helpful placeholder text
    - expect: Placeholder text is visible (e.g., 'What\'s your custom status?')
    - expect: Placeholder text is informative and guides user
  4. Click on the field and verify placeholder text disappears
    - expect: Placeholder text is hidden when field is focused
  5. Clear the field to verify placeholder text reappears
    - expect: Placeholder text returns when field is empty and unfocused

#### 4.2. Verify save button state changes

**File:** `tests/profile/save-button-states.spec.ts`

**Steps:**
  1. Navigate to profile page
    - expect: Profile with status form is loaded
  2. Observe the Save button state when no changes are made
    - expect: Save button is disabled (grayed out)
    - expect: Button shows visual indication it cannot be clicked
  3. Click on status field and modify the status
    - expect: Save button becomes enabled
    - expect: Button color/appearance changes to indicate it's clickable
  4. Clear the status field back to original value
    - expect: Save button returns to disabled state if status matches original
    - expect: OR button remains enabled if changes are detected

#### 4.3. Keyboard navigation and accessibility

**File:** `tests/profile/keyboard-accessibility.spec.ts`

**Steps:**
  1. Navigate to profile page
    - expect: Profile page is loaded
  2. Use Tab key to navigate to the custom status input field
    - expect: Status field receives focus via keyboard navigation
    - expect: Field is clearly highlighted with focus indicator
  3. Type a custom status using keyboard
    - expect: Status text is entered successfully
  4. Press Tab to navigate to Save button
    - expect: Save button receives focus
    - expect: Focus is clearly visible on the button
  5. Press Enter to activate Save button from keyboard
    - expect: Save button is activated
    - expect: Status is saved successfully

#### 4.4. Verify confirmation message after save

**File:** `tests/profile/save-confirmation-message.spec.ts`

**Steps:**
  1. Navigate to profile page and enter a custom status
    - expect: Status text is entered
  2. Click Save button
    - expect: Save action is initiated
  3. Observe for confirmation message or success indicator
    - expect: Success message is displayed (toast, snackbar, or alert)
    - expect: Message confirms status was saved
    - expect: Message is visible for appropriate duration
