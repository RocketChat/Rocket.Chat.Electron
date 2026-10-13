---
id: REL418-QA-050
title: Reset Window Sizes And Positions Recenters The App Windows
platforms: [windows, macos, linux]
priority: high
qase:
  suite: Release 4.18.0 / App shell
  priority: high
  severity: normal
  status: actual
  automation: manual
  qase_id: null
requires: [installed_prerelease_build]
test_links: []
expected_result: The Settings button and the View menu item both move the main window and each open secondary window to the center at the default size, and a window that was closed opens centered the next time.
---

# Reset Window Sizes And Positions Recenters The App Windows

## Review Basis

- Comparison range: 4.17.4..origin/dev at acaf3a712. Build under test: 4.18.0-alpha.6.
- Changed surface: #3488 (shipped in 4.17.1). It adds the `WINDOW_BOUNDS_RESET` action and the "Reset window sizes and positions" button in the settings window Advanced section. It adds the View menu item "Reset Window Sizes and Positions" and a centering fix in `src/ui/main/rootWindow.ts`. #3504 changes the settings window. The size after the reset is a fixed size (see REL418-QA-051).
- User-visible risk: A user who dragged a window off screen, or whose window was shrunk by a display change, cannot get it back. Or the reset moves only the main window. Or the main window ignores the reset on a display where 90% of the work area is not a whole number.
- Hypothesis: On every platform, one click of the button or the menu item recenters the main window and the open secondary windows. Windows that are closed open centered at their default size.
- Smallest useful proof: Unit specs for the reducers, `secondaryWindowState`, settings IPC and root window geometry. The PR author checked macOS only. This flow runs the same path on Windows and Linux.

## Steps

| Step | Action | Test data | Expected result | Agent action |
| --- | --- | --- | --- | --- |
| 1 | Start the installed app. Drag the main window by its title bar to the bottom-right corner of the screen. Drag its edge to make it small. | Any workspace added | The main window is small and sits in a screen corner. | Move the window with the OS window API. |
| 2 | Open the settings window. On macOS, click the "Rocket.Chat" menu at the top-left of the menu bar and click "Preferences". On Windows and Linux, press `Ctrl+,`. Drag the settings window to the top-left corner of the screen. | None | A window titled "App settings" opens. The window sits in the top-left corner. | Press the shortcut. Move the window. |
| 3 | Open the log viewer. Click the "Help" menu in the menu bar. Click "Open Log Viewer". Drag the log viewer window to the top-right corner. | None | The "Log Viewer" window opens and sits in the top-right corner. | Press `Ctrl+Shift+L` (`Cmd+Shift+L` on macOS). Move the window. |
| 4 | In the settings window, click "Advanced" in the left list. Scroll to the secondary button "Reset window sizes and positions". Read the gray hint under the button. Click the button. | None | The hint says "Forget where the app and its windows were placed. Each window opens at its default size, centered, the next time it is shown." After the click, the main window, the settings window and the log viewer window move to the center of the screen. | Click the button and read the window bounds. |
| 5 | Compare the main window with the screen. | None | The main window has its default size, and its center is near the center of the work area. It does not sit under the taskbar or the Dock. | Compare the bounds with the display work area. |
| 6 | Close the settings window and the log viewer window. Drag the main window to a corner again. Click the "View" menu in the menu bar. Click "Reset Window Sizes and Positions". This item is next to "Reset zoom". | None | The main window returns to the center. | Click the menu item. |
| 7 | Maximize the main window (green button on macOS, square button on Windows). Click "View", then "Reset Window Sizes and Positions". | Maximized window | The main window leaves the maximized state. It shows centered at its default size. | Maximize the window, click the item, read the state. |
| 8 | Open the settings window and the log viewer window again with the same steps as steps 2 and 3. | None | Both windows open at the center of the screen at their default size. They do not open in the corners. | Open the windows and read the bounds. |
| 9 | Windows and Linux with two displays only: move the main window to the second display. Click "View", then "Reset Window Sizes and Positions". | Two displays | The main window centers on its own display or on the primary display. No part of the window sits off screen. | Read the display of the window. |

## Evidence

- Screenshots of the screen after step 1, step 5, step 7 and step 8.
- The platform, the display resolution and the scale factor.

## Failure Signals

- The main window stays in the corner or keeps its small size.
- A window that was open before the reset does not move.
- A window opens in its old corner after the reset.
- The window is partly under the taskbar, the Dock or the screen edge.
- The button or the menu item is missing, or the label differs from the text in the steps.
