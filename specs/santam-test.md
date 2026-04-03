# Test Plan: Send "Welcome Santam" Message to Testing2 Channel

## Test Objective
Verify that a user can successfully navigate to the Testing2 Channel, type a message "Welcome Santam" in the message input textbox, and send it.

## Application Environment
- **Technology**: Rocket.Chat Electron Application with Playwright Test Framework
- **Browser**: Electron with embedded webview
- **Contact Point**: Localhost:3000

---

## Test Preconditions

### Assumptions
1. The Rocket.Chat Electron application is available and can be launched
2. The Testing2 channel exists on the connected Rocket.Chat server
3. The user account is authenticated or auto-logs in when the app starts
4. The application UI has loaded completely
5. The home page or channel list is available for navigation
6. Network connection is stable and responsive

### System Requirements
- Linux environment with X11 display server (or Wayland with appropriate flags)
- Playwright browser automation tools installed
- Electron application built and ready to test
- Port 3000 is accessible for webview content

---

## Primary Test Scenario: Send "Welcome Santam" Message

### Test Steps

| Step | Action | Expected Outcome | Element/Selector |
|------|--------|------------------|------------------|
| 1 | Launch Electron application with necessary flags (no-sandbox, disable-gpu, ozone-platform=x11) | Application starts successfully and first window opens | Electron app running |
| 2 | Wait for app initialization (5 seconds) | All async processes initialize, UI becomes responsive | Window ready |
| 3 | Locate and switch to webview page containing localhost:3000 | Webview page is detected and set as active context | URL contains "localhost:3000" |
| 4 | Wait for React app to load in webview | All React components render and UI becomes interactive | DOM elements available |
| 5 | Click the Home button to navigate to home page | User is redirected to home/channel list view | Selector: `button.rcx-navbar-item:has(i.rcx-icon--name-home)` |
| 6 | Wait for navigation to complete | Home page content loads completely | 2-second wait for DOM update |
| 7 | Locate Testing2 channel link | Channel link is visible in the channel list | Selector: `a[href="/channel/Testing2"]` |
| 8 | Click on Testing2 channel | User navigated to Testing2 channel; channel content displays | URL updated to include Testing2 |
| 9 | Wait for channel to load | Testing2 channel is fully loaded and interactive | 2-second wait for DOM update |
| 10 | Wait for message textarea to appear | Message input field is visible and ready for input | Selector: `textarea[name="msg"][aria-label="Message #Testing2"]` |
| 11 | Click on message textarea to focus | Textarea gains focus and is ready to accept text input | Cursor visible in textarea; focus state applied |
| 12 | Type "Welcome Santam" exactly | Text "Welcome Santam" appears in the message textarea | Selector: `textarea[name="msg"][aria-label="Message #Testing2"]` |
| 13 | Wait for UI to update (500ms) | Send button becomes enabled and clickable | Button ready state detected |
| 14 | Wait for Send button to be enabled | Send button is no longer disabled | Selector: `button[aria-label="Send"]:not([disabled])` |
| 15 | Click the Send button | Message is submitted to the Testing2 channel | API call triggered |
| 16 | Wait for message delivery (2 seconds) | Message appears in the channel message history | Message visible in chat |
| 17 | Close the Electron application | Application terminates cleanly | Process exits successfully |

---

## Expected Results

### Success Criteria
- ✓ Electron application launches without errors
- ✓ Webview page (localhost:3000) is detected and accessible
- ✓ Navigation to Testing2 channel completes successfully
- ✓ Message textarea is located and receives focus
- ✓ Text "Welcome Santam" is typed completely without truncation
- ✓ Send button is enabled after text input
- ✓ Message is successfully submitted
- ✓ No JavaScript errors appear in console
- ✓ Application closes cleanly

### Failure Conditions
- ✗ Electron application fails to launch or crashes
- ✗ Webview page not found after 30 attempts (30 seconds)
- ✗ Testing2 channel link not found in channel list
- ✗ Message textarea selector not matched (element not found)
- ✗ Text input fails or appears truncated
- ✗ Send button remains disabled or cannot be clicked
- ✗ Message send operation times out
- ✗ Application hangs or becomes unresponsive

---

## Test Variations & Edge Cases

### Variant 1: Empty Message After Typing
- **Steps**: Follow main test but focus on verifying textarea remains with text until Send is clicked
- **Expected**: Text persists in textarea; not cleared prematurely
- **Condition**: Verify text isn't auto-cleared before send action

### Variant 2: Send Button Disabled State
- **Steps**: Verify send button is initially disabled when textarea is empty
- **Expected**: Send button disabled until text "Welcome Santam" is typed
- **Condition**: Button should become enabled only after content entry

### Variant 3: Message Case Sensitivity
- **Steps**: Verify "Welcome Santam" is sent exactly as typed (with proper capitalization)
- **Expected**: Message appearance matches exactly: "Welcome Santam" (not "welcome santam" or other variations)
- **Condition**: Case preservation in message content

### Variant 4: Special Character Handling
- **Steps**: If testing extended, verify no special HTML/markdown characters break message
- **Expected**: Text sends cleanly with no interpretation as markup
- **Condition**: Applied only if message included special characters

### Variant 5: Keyboard vs Click Send
- **Alternative**: After typing, press Enter instead of clicking Send button
- **Expected**: Message sends successfully using keyboard shortcut
- **Condition**: Optional performance testing

---

## Test Execution Notes

### Timeout Values
- App initialization: 90 seconds (total test timeout)
- Window opening: 60 seconds
- Webview page discovery: 30 seconds (30 attempts × 1 second)
- Element selectors: 10-30 seconds (varies by element)
- Navigation wait: 2 seconds (fixed delays)

### Selector Strategy
- All selectors use aria-labels and HTML attributes for stability
- Fallback to CSS selectors if required
- No brittle selectors based on element order or position

### Logging
- Console logging at each major milestone for troubleshooting
- Success (✓), progress (>>), warning (⚠️), and wait (⏳) indicators
- Error messages captured for failed assertions

---

## Dependencies & Resources
- Playwright test framework configured in `playwright.config.ts`
- Electron app launch configuration (args include --no-sandbox, --disable-gpu, --ozone-platform=x11)
- Testing2 channel must exist on target server
- User must have access permissions to Testing2 channel
- Message history must be clearable for repeated testing

---

## Success Verification
At test completion:
1. Verify message "Welcome Santam" appears in Testing2 channel history
2. Verify message timestamp is recent (within test execution window)
3. Verify message sender is the current authenticated user
4. Verify no error messages in Rocket.Chat UI
5. Verify clean application shutdown in logs

---

## Related Tests
- `sendMessage.spec.ts` - Existing automated test with "Hello World" message
- `seed.spec.ts` - Marketplace navigation pattern
- `changeTheme.spec.ts` - UI interaction patterns
- `fileUpload.spec.ts` - File handling in channels

---

**Test Plan Version**: 1.0  
**Created**: March 6, 2026  
**Author**: Test Planning Agent  
**Status**: Ready for Implementation