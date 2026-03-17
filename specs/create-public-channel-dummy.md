# Test Plan: Create a Public Channel Named "Dummy"

## Overview
This test plan covers the complete workflow for creating a new public channel named "Dummy" in the Rocket.Chat application.

## Test Environment
- **Application URL**: `http://localhost:3000`
- **Expected Initial State**: User is logged in and on the Home page
- **Browser**: Any modern browser supported by Playwright

## Test Objectives
- Verify that users can create a public channel
- Confirm the channel is created with the correct name "Dummy"
- Verify the channel appears in the sidebar
- Ensure the channel is accessible and public

---

## Test Scenario: Create Public Channel Named "Dummy"

### Pre-conditions
- User is logged into the application
- User is on the Home page (`/home`)
- No channel named "Dummy" exists

### Steps

#### Step 1: Navigate to Home Page
**Action**: Ensure you are on the Home page
- **Selector**: Page URL should be `http://localhost:3000/home`
- **Expected Result**: Home page is fully loaded with welcome content visible

#### Step 2: Open Channel Creation Dialog
**Action**: Click the "Create channel" button
- **Selector**: `page.getByRole('button', { name: 'Create channel' })`
- **Alternative Selectors**:
  - Via "Create new" menu button: `page.getByRole('button', { name: 'Create new' })`
  - Region containing the button: Look for heading "Create channels" with text "Create a public channel that new workspace members can join."
- **HTML Context**:
  ```html
  <button>
    <generic>Create channel</generic>
  </button>
  ```
- **Expected Result**: A modal dialog titled "Create channel" appears on the screen

#### Step 3: Enter Channel Name
**Action**: Type "Dummy" in the Name field
- **Selector**: `page.getByRole('textbox', { name: 'Name' })`
- **Field Requirements**:
  - This is a required field (marked with *)
  - No spaces or special characters allowed
  - Help text: "No spaces or special characters"
- **HTML Context**:
  ```html
  <textbox aria-label="Name" value="">
  ```
- **Input**: `Dummy`
- **Expected Result**: 
  - Text "Dummy" appears in the Name field
  - No validation errors

#### Step 4: Verify Private Checkbox is Checked by Default
**Action**: Observe the Private checkbox state
- **Selector**: `page.getByRole('checkbox', { name: 'Private' })`
- **Attribute**: Look for `checkbox` with `checked` state
- **Initial State**: Should be checked (Private channel by default)
- **Default Help Text**: "People can only join by being invited"
- **Expected Result**: Private checkbox is checked by default

#### Step 5: Uncheck Private Checkbox to Make Channel Public
**Action**: Click on the Private checkbox to uncheck it
- **Selector**: Click the toggle switch for "Private"
- **Method 1 - Using Label Element**: 
  ```javascript
  document.querySelector('label.rcx-toggle-switch')?.click();
  ```
- **Method 2 - Direct Checkbox Click** (if label issue is resolved):
  - `page.getByRole('checkbox', { name: 'Private' }).click()`
- **HTML Context**:
  ```html
  <label class="rcx-box rcx-box--full rcx-toggle-switch">
    <input type="checkbox" class="rcx-toggle-switch__input" />
  </label>
  ```
- **Expected Result**:
  - Private checkbox becomes unchecked
  - Help text changes to "Anyone can access"
  - Channel will be public

#### Step 6: Verify Topic Field (Optional)
**Action**: Optionally verify Topic field
- **Selector**: `page.getByRole('textbox', { name: 'Topic' })`
- **Field Type**: Optional text field
- **Help Text**: "Displayed next to name"
- **Expected Result**: Topic field is visible and empty (can be left blank)

#### Step 7: Verify Members Field (Optional)
**Action**: Optionally verify Members field
- **Selector**: Look for "Members" label with an "Add people" textbox
- **Listbox Selector**: `page.locator('[role="listbox"]')`
- **Textbox Selector**: `page.getByRole('textbox', { name: 'Add people' })`
- **Field Type**: Optional field to add members during creation
- **Expected Result**: Members field is visible with "Add people" textbox (can be left empty)

#### Step 8: Submit the Form
**Action**: Click the "Create" button
- **Selector**: `page.getByRole('button', { name: 'Create', exact: true })`
- **Button Location**: Bottom right of the dialog in the button group with "Cancel" button
- **HTML Context**:
  ```html
  <button>
    <generic>Create</generic>
  </button>
  ```
- **Expected Result**: 
  - Dialog closes
  - Page redirects to the new channel page

### Post-conditions / Verification Steps

#### Verification 1: Confirm Navigation to Channel Page
- **Expected URL**: `http://localhost:3000/channel/Dummy`
- **Page Title**: Should contain "Dummy - Santam Private Server"
- **Assertion**: `await expect(page).toHaveURL('http://localhost:3000/channel/Dummy')`

#### Verification 2: Confirm Success Alert
- **Selector**: Look for alert message
- **Expected Text**: "Room has been created"
- **Alert Appearance**: Alert should appear briefly at the bottom of the screen
- **HTML Context**:
  ```html
  <alert>Room has been created</alert>
  ```

#### Verification 3: Confirm Channel Appears in Sidebar
- **Location**: Left sidebar under "Channels" section
- **Selector**: `page.getByRole('link', { name: 'Dummy' })`
- **Expected Result**: "Dummy" channel link appears in the channels list above other channels
- **Position**: Should be first in the Channels list

#### Verification 4: Confirm Channel Header
- **Selector**: Look for heading with text "Dummy"
- **Element**: `page.getByRole('heading', { name: 'Dummy', level: 1 })`
- **Expected Result**: Channel name "Dummy" displays in the main content area as the page heading

#### Verification 5: Confirm Channel is Public
**Method**: Check channel info or attempt to verify the channel is accessible
- The channel should not have a private lock icon
- "Anyone can access" should be the access level (visible in channel info)

#### Verification 6: Message Compose Area Visible
- **Selector**: Look for message input field
- **Expected**: `page.getByRole('textbox', { name: /Message #Dummy/ })`
- **Expected Result**: Message composition area is ready for use with placeholder text "Message #Dummy"

---

## Success Criteria

✅ Channel creation dialog opens successfully  
✅ "Dummy" is entered in the Name field  
✅ Private checkbox is unchecked (channel is public)  
✅ Create button click redirects to `/channel/Dummy`  
✅ Success alert "Room has been created" appears  
✅ "Dummy" channel appears in the left sidebar  
✅ Channel header displays "Dummy"  
✅ Channel is accessible (message area is ready)  
✅ No error messages appear during the process  

---

## Failure Scenarios to Test

### Scenario 1: Channel Name with Special Characters
- **Action**: Try to create a channel with name "Dummy#123"
- **Expected**: Validation error should appear
- **Help Text**: "No spaces or special characters"

### Scenario 2: Identical Channel Name
- **Action**: Try to create another channel with name "Dummy" (after first one exists)
- **Expected**: Error message indicating channel name already exists

### Scenario 3: Empty Channel Name
- **Action**: Leave Name field empty and click Create
- **Expected**: Validation error - "Name is required" or similar

### Scenario 4: Channel Name with Spaces
- **Action**: Try to create a channel with name "Dummy Channel"
- **Expected**: Validation error should appear

### Scenario 5: Cancel Channel Creation
- **Action**: Click Cancel button in the dialog
- **Expected**: Dialog closes without creating channel, returns to previous page

---

## Edge Cases

1. **Very Long Channel Name**: Test with maximum allowed character length
2. **Topic with Special Characters**: Verify topic field accepts special characters
3. **Adding Members During Creation**: Verify members can be added at channel creation time
4. **Advanced Settings**: Click "Advanced settings" to explore additional options before creation
5. **Rapid Sequential Creation**: Attempt creating multiple channels in quick succession

---

## Selectors Summary

| Element | Primary Selector | Backup Selector |
|---------|------------------|-----------------|
| Create channel button | `page.getByRole('button', { name: 'Create channel' })` | Home page button |
| Name field | `page.getByRole('textbox', { name: 'Name' })` | `page.getByLabel('Name')` |
| Topic field | `page.getByRole('textbox', { name: 'Topic' })` | `page.getByLabel('Topic')` |
| Private checkbox | `page.getByRole('checkbox', { name: 'Private' })` | `label.rcx-toggle-switch` |
| Create button | `page.getByRole('button', { name: 'Create', exact: true })` | Dialog close option |
| Cancel button | `page.getByRole('button', { name: 'Cancel' })` | Dialog X button |
| Channel link in sidebar | `page.getByRole('link', { name: 'Dummy' })` | Channels list item |
| Success alert | `page.getByRole('alert').getByText('Room has been created')` | Alert region |

---

## Notes

- The "Private" checkbox uses a toggle switch component which may have an intercepting label. Use JavaScript evaluation or direct label click if standard checkbox click fails.
- The channel name field contains help text "No spaces or special characters" indicating validation rules.
- Creating a channel is a fast operation - the page redirect should happen immediately after clicking Create.
- The success alert "Room has been created" may disappear after a few seconds, so verify channel existence via sidebar or URL.
- The Messages area will show "Start of conversation" as the first message in an empty new channel.

---

## Test Data

- **Channel Name**: Dummy
- **Channel Type**: Public (Private checkbox unchecked)
- **Topic**: (leave empty)
- **Members**: (leave empty)

---

## Test Execution Time

**Estimated Duration**: 2-3 minutes per test execution

---

## Author

Generated by AI Test Planner for Rocket.Chat  
Date: 2026-03-16
