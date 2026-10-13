---
id: REL418-QA-032
title: Tab menu Reload and View Reload recover a hung workspace
platforms: [windows, macos, linux]
priority: high
qase:
  suite: Release 4.18.0 / Workspaces
  priority: high
  severity: major
  status: actual
  automation: manual
  qase_id: null
requires: [installed_prerelease_build]
test_links: []
expected_result: Reload from the workspace tab menu and Reload from the View menu both load a working page when the workspace is hung.
---

# Menu Reload Recovers A Hung Workspace

## Review Basis

- Comparison range: 4.17.4..origin/dev at acaf3a712.
- Changed surface: #3533. The tab context menu `Reload` and `View` > `Reload`
  call `terminateIfUnresponsive` before they load the workspace root.
- User-visible risk: Both menu items call reload on the frozen renderer, which
  never answers.
- Hypothesis: After the failure view shows, two actions each start a new
  renderer and load the workspace. One is the tab context menu `Reload`. The
  other is `View` > `Reload` (Command+R on macOS, Ctrl+R on Windows and Linux).
- Smallest useful proof: Local UI repro with the DevTools loop from
  REL418-QA-030. The author did not test these two paths by hand.

## Steps

| Step | Action | Test data | Expected result | Agent action |
| --- | --- | --- | --- | --- |
| 1 | Start the installed build with one signed-in workspace tab selected in the top tab strip. | One workspace | The workspace page shows. | Start the app and select the tab. |
| 2 | Right-click the tab. Click `Open DevTools`. In the `Console` tab, type the command and press Enter. Do not click the workspace page. | `while(true){}` | The workspace page stops reacting. | Evaluate the loop in the workspace console. |
| 3 | Wait up to 30 seconds. | | The failure view shows: `Server Failed to Load` and the button `Reload (N)`. | Wait and capture the pane. |
| 4 | Right-click the workspace tab in the top strip. In the menu, click `Reload`. | | The workspace page loads again and is signed in. The failure view is gone. | Choose `Reload` in the tab context menu. Capture the page. |
| 5 | Repeat steps 2 and 3. | `while(true){}` | The failure view shows again. | Repeat the loop and wait. |
| 6 | Open the `View` menu. On macOS it is in the menu bar at the top of the screen. On Windows and Linux it is in the menu bar at the top of the window. If the menu bar is hidden, press Alt. Click `Reload`. | | The workspace page loads again and is signed in. The failure view is gone. | Choose `View` > `Reload`. Capture the page. |
| 7 | Click in the message composer and type a few letters. | `abc` | The letters appear in the composer. | Type in the composer and read it back. |

## Evidence

- Screenshots after steps 3, 4, and 6.

## Failure Signals

- A menu `Reload` leaves the failure view on screen after 30 seconds.
- A menu `Reload` shows the spinner but the page never loads.
- The app needs a restart to recover.
