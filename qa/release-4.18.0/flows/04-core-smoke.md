---
id: REL418-QA-004
title: Core daily use works on the installed build
platforms: [macos, windows, linux]
priority: smoke
qase:
  suite: Release 4.18.0 / Install and upgrade
  priority: high
  severity: critical
  status: actual
  automation: manual
  qase_id: null
requires: [installed_prerelease_build, two_accounts_same_workspace]
test_links: []
expected_result: A user can sign in, send and receive messages, get and click a notification, download a file, use the tray icon, and quit and reopen with the state kept.
---

# Core Daily Use Works On The Installed Build

## Review Basis

- Comparison range: 4.17.4..origin/dev at acaf3a712.
- Changed surface: the shared code that each change in the range touches.
  #3514, #3515, and #3516 removed dead code from the main window, the
  settings, the downloads, and the log viewer. #3533 added a heartbeat to
  each workspace view. #3535 changed how the main window opens when the app starts.
- User-visible risk: a removal or a new watcher breaks a daily action
  that no change flow covers.
- Hypothesis: the daily actions of 4.17.4 still work on the build under
  test.
- Smallest useful proof: one pass of the daily actions on each OS. The
  change flows cover the new behavior. This flow covers what must not
  change.

## Steps

| Step | Action | Test data | Expected result | Agent action |
| --- | --- | --- | --- | --- |
| 1 | Start Rocket.Chat. On the add-workspace screen, type the URL in the field labeled "Enter your server URL" and click Connect. Sign in. | Workspace URL and account A. | The workspace home page shows. A workspace icon shows in the left vertical server list. | Take a screenshot. |
| 2 | Open a direct message with account B. Type a message in the composer at the bottom of the room and press Enter. | Account B. | The message shows in the room once. | Take a screenshot. |
| 3 | Click another app so that Rocket.Chat is not the front window. From a second device, sign in as account B and send a direct message to account A. | Text: "smoke notification". | The OS shows a notification with the text. On macOS and Windows, the app icon (Dock or taskbar) shows an unread count. | Take a screenshot of the notification. |
| 4 | Click the notification. | None. | Rocket.Chat comes to the front and opens the direct message with account B. | Take a screenshot. |
| 5 | Upload a small file in the room: click the plus button at the left of the composer and select a file. Then click the file in the room to download it. | A text file of less than 1 MB. | The file downloads. | Record the file name. |
| 6 | Press Command+D (macOS) or Ctrl+D (Windows, Linux). | None. | The Downloads window opens and lists the file from step 5 as complete. | Take a screenshot of the Downloads window. |
| 7 | Find the Rocket.Chat icon on macOS in the menu bar at the top right. On Windows, find it in the notification area at the bottom right. On Linux, find it in the top panel. Click it. | None. | A menu opens with the presence options and Quit, or the main window comes to the front. | Take a screenshot. Existing tray flows: CORE-2525-QA-001 to CORE-2525-QA-013. |
| 8 | Quit Rocket.Chat. On macOS, click the Rocket.Chat menu at the left of the menu bar, then click Quit Rocket.Chat. On Windows and Linux, click the File menu at the top left of the window, then click Quit Rocket.Chat. Start the app again. | None. | The main window opens. The workspace opens signed in, on the last room. | Take a screenshot. |
| 9 | Click the Help menu and click Open Log Viewer. | None. | The Log Viewer window opens and shows log lines from this session. | Take a screenshot. |

## Evidence

- Screenshots of each step.
- The Log Viewer content, saved to a file, if a step fails.

## Failure Signals

- A message shows twice, or does not send.
- No OS notification shows, or a click on it does not open the room.
- The Downloads window is empty or does not open.
- No tray or menu-bar icon shows.
- After the restart, the workspace shows the sign-in page.
- The Log Viewer is empty or does not open.
