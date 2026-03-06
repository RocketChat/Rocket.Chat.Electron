# User Profile Custom Status Test Plan

## Application Overview

This test plan covers the complete user flow for navigating to the user profile and creating a custom status in the Rocket.Chat Electron desktop application. Users can personalize their profile by setting a custom status message with an optional emoji. The application is an Electron desktop wrapper around a Rocket.Chat web interface running on localhost:3000.

## Test Scenarios

### 1. Profile and Custom Status Management

**Seed:** `e2e/seed.spec.ts`

#### 1.1. Navigate to profile and create custom status with text

**File:** `e2e/userProfileCustomStatus.spec.ts`

**Steps:**
  1. Launch Electron application with sandbox disabled and required flags
    - expect: Electron process starts successfully
    - expect: Main window displays the application
  2. Wait 5 seconds for the application to fully initialize
    - expect: All application components are loaded
    - expect: Webview page with localhost:3000 is available
  3. Verify the Rocket.Chat React application is fully loaded by checking for navbar elements
    - expect: React app renders successfully
    - expect: Navigation bar is visible and interactive
  4. Click the Home button in the navbar to establish a consistent starting state
    - expect: User is navigated to the home page
    - expect: Home view is displayed
  5. Wait 2 seconds for navigation animation to complete
    - expect: Page content stabilizes
    - expect: Navigation finishes
  6. Locate the user avatar image in the header/navbar area
    - expect: User avatar is visible
    - expect: Avatar element is accessible
  7. Click on the user avatar to open the profile dropdown menu
    - expect: Dropdown menu appears
    - expect: Menu displays profile options
  8. Wait 1 second for the dropdown menu to fully render
    - expect: All menu items are visible
    - expect: Menu is properly positioned
  9. Locate and click on 'My Profile' option in the dropdown menu
    - expect: Profile page or modal opens
    - expect: Profile information is displayed and editable
  10. Wait 2 seconds for the profile page to fully load
    - expect: All profile fields are visible
    - expect: Profile edit form is ready for interaction
  11. Locate the custom status input field (labeled 'Status Message' or 'Custom Status')
    - expect: Custom status input field is visible
    - expect: Field is empty or shows placeholder text
  12. Click on the custom status input field to focus it
    - expect: Input field is focused
    - expect: Cursor is visible in the field
  13. Type a custom status message (e.g., 'In a meeting')
    - expect: Text is entered into the field
    - expect: Text is visible in the input
  14. Wait 1 second for the form to update
    - expect: Form reflects the entered text
    - expect: No validation errors appear
  15. Locate the Save button to persist the custom status
    - expect: Save button is visible and enabled
    - expect: Save button is clearly labeled
  16. Click the Save button to save the custom status
    - expect: Profile form submits successfully
    - expect: Success notification appears or page indicates save completed
  17. Wait 2 seconds for the save operation to complete
    - expect: Profile page closes or returns to previous view
    - expect: Custom status change is reflected in the UI

#### 1.2. Create custom status with emoji and text

**File:** `e2e/userProfileCustomStatus.spec.ts`

**Steps:**
  1. Launch Electron application with required sandbox and GPU disabled flags
    - expect: Electron process starts successfully
    - expect: Main window is displayed
  2. Wait for application to initialize (5 seconds)
    - expect: React app is fully loaded
    - expect: Webview page is accessible
  3. Click Home button in the navbar to reset to home page
    - expect: User navigates to home page
    - expect: Home view is displayed
  4. Wait 2 seconds for navigation to complete
    - expect: Page content stabilizes
  5. Click on the user avatar to open the profile dropdown menu
    - expect: Profile dropdown menu appears
    - expect: Profile options are visible
  6. Click on 'My Profile' option in the dropdown
    - expect: Profile page or modal opens
    - expect: User profile information is displayed
  7. Wait 2 seconds for profile page to fully load
    - expect: All profile fields are visible and editable
  8. Locate the emoji picker button or selector near the custom status field
    - expect: Emoji picker button is visible
    - expect: Emoji selector is accessible
  9. Click the emoji picker button to open emoji selection dialog
    - expect: Emoji picker dialog opens
    - expect: Emoji categories or search field is visible
  10. Search for or select an appropriate emoji (e.g., smiley face)
    - expect: Intended emoji is found
    - expect: Emoji selection option is visible
  11. Click to select the chosen emoji
    - expect: Emoji is selected
    - expect: Emoji picker closes or updates
  12. Locate the custom status text input field
    - expect: Text input field is visible
    - expect: Field is ready for text input
  13. Type a custom status message (e.g., 'Happy to help!')
    - expect: Text is entered successfully
    - expect: Text appears in the input field
  14. Verify both emoji and text appear together in the custom status field
    - expect: Emoji and text are displayed together
    - expect: Format is visually clear and readable
  15. Click the Save button to persist the custom status with emoji
    - expect: Status saves successfully
    - expect: Success confirmation appears
  16. Wait 2 seconds for save to complete
    - expect: Profile page closes or returns to previous view
    - expect: Custom status changes are persisted
  17. Verify the emoji and text are both visible in the user profile
    - expect: Emoji displays correctly in profile
    - expect: Status text displays correctly
    - expect: Both appear together as set status

#### 1.3. Clear and remove custom status

**File:** `e2e/userProfileCustomStatus.spec.ts`

**Steps:**
  1. Launch Electron application with required flags
    - expect: Electron process starts successfully
    - expect: Main window is displayed
  2. Wait for application initialization (5 seconds) and navigate to webview
    - expect: React app is loaded
    - expect: User interface is ready
  3. Click Home button to establish consistent starting state
    - expect: User is on home page
  4. Wait 2 seconds for navigation to complete
    - expect: Page content is ready
  5. Click user avatar to open profile dropdown menu
    - expect: Profile dropdown is visible
  6. Click 'My Profile' option to open profile page
    - expect: Profile page opens
  7. Wait 2 seconds for profile page to fully load
    - expect: Profile form is fully rendered and editable
  8. Locate the custom status field that contains the previously entered status message
    - expect: Custom status field displays current status
    - expect: Field is visible and editable
  9. Clear the custom status field by selecting all text and deleting it
    - expect: All text in custom status field is removed
    - expect: Field is now empty or blank
  10. Wait 1 second for form to update
    - expect: Form reflects the cleared status
    - expect: No validation errors appear
  11. Click the Save button to persist the removal of custom status
    - expect: Save operation completes
    - expect: Success notification appears
  12. Wait 2 seconds for save to complete
    - expect: Profile page closes or returns to previous view
    - expect: Custom status is removed from user profile
  13. Verify custom status no longer appears in the user profile or UI
    - expect: Status message is no longer visible
    - expect: User profile shows no custom status set
