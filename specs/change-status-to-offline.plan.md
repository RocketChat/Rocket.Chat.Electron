# Change User Status to Offline Test Plan

## Application Overview

This test plan covers the feature of changing user status to offline in the Rocket.Chat Electron client. The test verifies the complete user journey from launching the application, navigating to the user profile via avatar, and changing the status to offline. The application is an Electron desktop wrapper around a Rocket.Chat web interface running on localhost:3000.

## Test Scenarios

### 1. User Status Management

**Seed:** `e2e/seed.spec.ts`

#### 1.1. Change user status to offline from profile menu

**File:** `e2e/changeStatusToOffline.spec.ts`

**Steps:**
  1. Launch Electron application with necessary flags: --no-sandbox, --disable-setuid-sandbox, --disable-gpu, --ozone-platform=x11
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
  5. Click the Home button in the navbar (identified by selector 'button.rcx-navbar-item:has(i.rcx-icon--name-home)')
    - expect: User is navigated to the home page
    - expect: Home view is displayed
    - expect: Navigation completes successfully
  6. Wait 2 seconds for the page to complete navigation
    - expect: Page content stabilizes
    - expect: Navigation animation completes
  7. Locate the user avatar image element using selector 'img[data-username]' to find the user's avatar
    - expect: User avatar image is visible in the header/navbar area
    - expect: Avatar element is located successfully
  8. Click on the user avatar to open the profile dropdown menu
    - expect: Dropdown menu appears immediately after clicking
    - expect: Menu displays user profile options including status and settings
  9. Wait 1 second for the dropdown menu to fully render and display all options
    - expect: All menu items are visible and interactive
    - expect: Menu is properly positioned
  10. Locate and interact with the status menu option in the dropdown, typically indicated by a status icon or label
    - expect: Status menu item is visible in the dropdown
    - expect: Status menu item responds to user interaction
  11. Click on the status option to reveal the status submenu with individual status choices
    - expect: Status submenu or popover appears with available status options
    - expect: Options include: Online, Away, Busy, Invisible/Offline
  12. Locate the 'Offline' status option in the status menu
    - expect: Offline option is visible and selectable
    - expect: Offline option is distinctly labeled
  13. Click on the 'Offline' status option to change the user's status to offline
    - expect: Status change request is sent to the server
    - expect: User avatar or status indicator updates to reflect offline status
    - expect: Dropdown menu closes after selection
  14. Wait 2 seconds for the status change to propagate through the application and update all UI elements
    - expect: Status change is reflected in all relevant UI components
    - expect: User status is synchronized across the application

#### 1.2. Verify status change persists across navigation

**File:** `e2e/changeStatusToOffline.spec.ts`

**Steps:**
  1. Ensure user is in offline status from the previous test or by changing status to offline
    - expect: User status indicator shows offline
  2. Click on a different channel or navigate to another page/section in the Rocket.Chat interface
    - expect: Navigation completes successfully
    - expect: Page content changes to show the new location
  3. Return to the home page or navigate to an area where user status is visibly displayed
    - expect: Navigation request completes
    - expect: User status indicator is visible
  4. Visually verify the user avatar and status indicator throughout navigation
    - expect: Status still shows as offline
    - expect: Offline indicator is maintained throughout navigation
    - expect: User avatar shows offline visual indicator (typically grayed out)

#### 1.3. Change status from offline back to online (Cleanup test)

**File:** `e2e/changeStatusToOffline.spec.ts`

**Steps:**
  1. Verify user profile avatar element is currently visible on the page
    - expect: User is currently in offline status
    - expect: Avatar element is accessible and clickable
  2. Click on the user avatar to open the profile dropdown menu
    - expect: Profile dropdown menu opens successfully
    - expect: Status option is visible and accessible
  3. Click on the status option to open the status submenu or popover
    - expect: Status submenu appears showing all available status options
    - expect: Status choices are clearly displayed
  4. Click on the 'Online' status option to return the user to online status
    - expect: Online status is selected
    - expect: Avatar indicator updates to show online status
    - expect: Profile menu closes automatically

#### 1.4. Handle missing avatar element gracefully

**File:** `e2e/changeStatusToOffline.spec.ts`

**Steps:**
  1. Attempt to find the user avatar element using the 'img[data-username]' selector with a 30-second timeout
    - expect: Avatar element is found reliably within the timeout period
    - expect: Element selector correctly identifies the user avatar
  2. If avatar element is not found within 30 seconds, verify error handling
    - expect: Test logs appropriate warning or error message
    - expect: Test execution fails gracefully with clear error information

#### 1.5. Validate visual feedback in status menu

**File:** `e2e/changeStatusToOffline.spec.ts`

**Steps:**
  1. Open the user avatar dropdown menu by clicking on the avatar image
    - expect: Dropdown menu appears with clear visual distinction from the page
    - expect: Menu positioning is correct relative to the avatar element
  2. Click on the status option to reveal the status submenu
    - expect: Status submenu displays all available status options
    - expect: Current status is visually indicated or highlighted
    - expect: Options are clearly labeled (Online, Away, Busy, Offline)
  3. Click on the Offline option and observe the visual feedback
    - expect: Avatar updates with offline visual indicator (grayed out color is typical)
    - expect: Visual feedback is immediate or within 1 second
    - expect: No visual glitches, flickering, or unexpected layout shifts occur
