# Create and Save Custom Status Test Plan

## Application Overview

This test plan covers the feature of creating and saving a custom status in the Rocket.Chat Electron desktop application. Users can set a custom status message and optional emoji to personalize their profile. The application is an Electron desktop wrapper around a Rocket.Chat web interface running on localhost:3000.

## Test Scenarios

### 1. Custom Status Management

**Seed:** `e2e/seed.spec.ts`

#### 1.1. Create custom status with text message

**File:** `e2e/createCustomStatus.spec.ts`

**Steps:**
  1. -
    - expect: Electron process starts successfully
    - expect: Main window is displayed
    - expect: Window URL is accessible
  2. Wait 5 seconds for the application to fully initialize
    - expect: All application components are ready
    - expect: Webview page is available for interaction
  3. Locate and access the webview page containing localhost:3000 from the browser context
    - expect: Webview page is found and accessible
    - expect: Page contains the Rocket.Chat interface
  4. Wait for the React application to fully load in the webview, checking for navbar elements
    - expect: Rocket.Chat React app is fully loaded and rendered
    - expect: All components are interactive and visible
  5. Click the Home button in the navbar to ensure consistent starting state
    - expect: User is navigated to the home page
    - expect: Home view is displayed
  6. Wait 2 seconds for navigation to complete
    - expect: Page content stabilizes
    - expect: Navigation animation completes
  7. Locate the user avatar image element in the header/navbar area
    - expect: User avatar image is visible in the header/navbar
    - expect: Avatar element is located successfully
  8. Click on the user avatar to open the profile dropdown menu
    - expect: Dropdown menu appears with user profile options
    - expect: Menu displays available actions including profile settings
  9. Wait 1 second for the dropdown menu to fully render
    - expect: All menu items are visible and interactive
    - expect: Menu is properly positioned
  10. Locate the 'My Profile' option in the dropdown menu
    - expect: 'My Profile' option is visible in the dropdown
    - expect: Option is clearly labeled and selectable
  11. Click on 'My Profile' to open the user profile settings/edit page
    - expect: Profile page or modal opens
    - expect: User profile information is displayed and editable
  12. Wait 2 seconds for the profile page/modal to fully load and render
    - expect: All profile fields are visible
    - expect: Profile edit form is ready for input
  13. Locate the custom status input field in the profile form (typically labeled 'Status Message' or 'Custom Status')
    - expect: Custom status input field is visible
    - expect: Field is empty or shows placeholder text
  14. Click on the custom status input field to focus it
    - expect: Input field is focused (shows cursor or focus indicator)
    - expect: Field is ready for text input
  15. Type a custom status message (e.g., 'In a meeting')
    - expect: Text is entered into the custom status field
    - expect: Text is visible in the input field
    - expect: No validation errors appear
  16. Wait 1 second for any auto-save or form update
    - expect: Form updates reflect the entered text
    - expect: Character count (if displayed) updates correctly
  17. Locate the Save button or confirm that changes auto-save
    - expect: Save button is visible and enabled, or auto-save indicator is present
  18. Click the Save button to persist the custom status
    - expect: Profile form submits successfully
    - expect: Success message or notification appears
    - expect: Changes are persisted to the server
  19. Wait 2 seconds for the save operation to complete
    - expect: Profile page closes or returns to previous view
    - expect: Status change is reflected in the UI
  20. Verify the custom status is now visible in the user profile or user list
    - expect: Custom status message appears in the user's profile
    - expect: Custom status is visible in other UI elements (e.g., user avatar hover, user list)

#### 1.2. Create custom status with emoji and text

**File:** `e2e/createCustomStatus.spec.ts`

**Steps:**
  1. -
    - expect: Electron process starts successfully
    - expect: Main window is displayed
  2. Wait for application to initialize and webview to load
    - expect: React app is fully loaded
    - expect: Navbar and avatar are visible
  3. Click Home button to ensure consistent starting state
    - expect: User navigates to home page
  4. Click on user avatar to open profile dropdown
    - expect: Dropdown menu appears with profile options
  5. Click on 'My Profile' option
    - expect: Profile page or modal opens displaying user profile information
  6. Wait for profile page to fully load
    - expect: All profile fields are visible and editable
  7. Locate the emoji picker or emoji selector for custom status (if available)
    - expect: Emoji picker button or selector is visible near custom status field
  8. Click the emoji picker to open emoji selection dialog
    - expect: Emoji picker dialog/popover opens
    - expect: Emoji categories or search are visible
  9. Search for or select an appropriate emoji (e.g., 😊 happy face)
    - expect: Emoji is selectable and visible in the picker
  10. Click to select the emoji
    - expect: Emoji is selected and appears in the custom status field
    - expect: Emoji picker closes or updates
  11. Locate the custom status text input field
    - expect: Custom status text field is visible and focused or ready for input
  12. Type custom status message (e.g., 'Happy to help!')
    - expect: Text is entered successfully
    - expect: Text appears in the input field
  13. Verify that both emoji and text appear together in the custom status
    - expect: Custom status shows emoji followed by text (or text following emoji)
    - expect: Format is visually clear and readable
  14. Click Save button to persist the custom status with emoji
    - expect: Status is saved successfully
    - expect: Success message or confirmation appears
  15. Wait for save to complete and profile page to close
    - expect: Changes are persisted
    - expect: Custom status appears in profile or user interface
  16. Verify the emoji and text are both visible in the user's profile
    - expect: Emoji is displayed correctly
    - expect: Text message is displayed correctly
    - expect: Both appear together as custom status

#### 1.3. Clear/remove custom status

**File:** `e2e/createCustomStatus.spec.ts`

**Steps:**
  1. -
    - expect: Electron process starts successfully
    - expect: Application is ready
  2. Wait for application initialization and navigate to webview
    - expect: React app is loaded
    - expect: User interface is ready
  3. Click Home button to ensure consistent state
    - expect: Home page is displayed
  4. Click user avatar to open profile dropdown
    - expect: Dropdown menu is visible
  5. Click 'My Profile' option
    - expect: Profile page opens
  6. Wait for profile page to fully load
    - expect: Profile form is fully rendered and editable
  7. Locate the custom status field which currently contains text
    - expect: Custom status field displays the previously saved status message
  8. Clear the custom status field by selecting all text and deleting it
    - expect: Custom status field is now empty
  9. Click Save button to persist the empty status
    - expect: Status removal is saved successfully
    - expect: Custom status is cleared from server
  10. Wait for save operation to complete
    - expect: Profile page closes or updates
    - expect: No custom status message is displayed
  11. Verify custom status is removed from user profile
    - expect: Custom status field is empty
    - expect: No status message appears in user profile or anywhere in the UI

#### 1.4. Validate custom status character limit

**File:** `e2e/createCustomStatus.spec.ts`

**Steps:**
  1. -
    - expect: Electron process starts successfully
  2. Initialize application and navigate to home page
    - expect: React app is loaded and ready
  3. Click user avatar and open profile dropdown
    - expect: Profile menu is visible
  4. Click 'My Profile' to open profile page
    - expect: Profile editing form is displayed
  5. Wait for profile page to fully load
    - expect: All profile fields are visible
  6. Locate custom status input field
    - expect: Custom status field is visible and empty
  7. Click custom status field to focus it
    - expect: Field is focused and ready for input
  8. Type a status message that exceeds the maximum character limit (if one exists - typical limit is 256-512 characters)
    - expect: Text is entered or truncated according to character limit
    - expect: Character count indicator (if present) shows current count
    - expect: No characters beyond limit are accepted
  9. Verify character limit enforcement
    - expect: Additional characters are not accepted beyond the limit
    - expect: A character count or warning message is displayed (if applicable)
    - expect: The field does not allow exceeding the limit
  10. Enter a valid custom status within the character limit
    - expect: Text is entered successfully
    - expect: No validation errors appear
  11. Click Save button
    - expect: Status is saved successfully without any truncation errors

#### 1.5. Edit existing custom status

**File:** `e2e/createCustomStatus.spec.ts`

**Steps:**
  1. -
    - expect: Electron process starts successfully
    - expect: Application is fully initialized
  2. Wait for webview to load and navigate to home page
    - expect: React app is loaded
    - expect: Home view is displayed
  3. Click user avatar to open profile dropdown menu
    - expect: Profile dropdown is visible
  4. Click 'My Profile' option
    - expect: Profile page opens and displays current user information including existing custom status
  5. Wait for profile page to fully load
    - expect: Custom status field shows the previously saved status message
  6. Locate the custom status field with existing text
    - expect: Custom status field displays the current status message
  7. Click on the custom status field to focus it
    - expect: Field is focused and ready for editing
  8. Select all text in the field and replace it with a new status message
    - expect: Old text is replaced with new text
    - expect: New status message is visible in the field
  9. Verify the updated status message in the field
    - expect: Field displays the updated custom status
    - expect: No validation errors appear
  10. Click Save button to persist the updated custom status
    - expect: Status update is saved successfully
    - expect: Success confirmation appears
  11. Wait for save operation to complete and verify the new custom status
    - expect: Profile page closes or updates
    - expect: New custom status is reflected in the user profile
    - expect: Updated status is visible throughout the application

#### 1.6. Handle network error when saving custom status

**File:** `e2e/createCustomStatus.spec.ts`

**Steps:**
  1. -
    - expect: Electron process starts successfully
  2. Initialize application and navigate to profile page
    - expect: React app is loaded
    - expect: Profile page is accessible
  3. Wait for profile page to load
    - expect: Profile form is fully rendered
  4. Enter a custom status message in the custom status field
    - expect: Text is entered successfully
  5. Simulate network disconnection or server timeout (if testing framework supports it)
    - expect: Network error condition is simulated
  6. Click Save button to attempt saving the custom status
    - expect: Save request fails due to network error or timeout
  7. Verify error message or notification is displayed
    - expect: User-friendly error message appears
    - expect: Error indicates network or server issue
    - expect: Message suggests retry or connection check
  8. Verify that the entered custom status text is still in the field (not lost)
    - expect: Custom status text remains in the input field
    - expect: User data is preserved for retry
  9. Restore network connectivity or wait for timeout to clear
    - expect: Network connection is restored (if simulated)
  10. Click Save button again to retry saving the custom status
    - expect: Save request succeeds after network is restored
    - expect: Custom status is saved successfully
