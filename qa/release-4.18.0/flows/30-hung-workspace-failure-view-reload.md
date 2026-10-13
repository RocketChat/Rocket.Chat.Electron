---
id: REL418-QA-030
title: A hung workspace shows the failure view and Reload recovers it
platforms: [windows, macos, linux]
priority: release
qase:
  suite: Release 4.18.0 / Workspaces
  priority: high
  severity: major
  status: actual
  automation: manual
  qase_id: null
requires: [installed_prerelease_build]
test_links: []
expected_result: A workspace page that is stuck in a loop is replaced by the "Server Failed to Load" view within about 30 seconds, and Reload (button or countdown) loads a working page.
---

# A Hung Workspace Shows The Failure View And Reload Recovers It

## Review Basis

- Comparison range: 4.17.4..origin/dev at acaf3a712.
- Changed surface: #3533. Main-process heartbeat for workspace views, failure
  view for `unresponsive` and `render-process-gone`, and Reload that first
  kills a hung renderer.
- User-visible risk: A workspace page that is stuck in a loop freezes the
  pane. Reload does nothing, because it waits on the frozen renderer. Only
  quitting the app helped.
- Hypothesis: A workspace page stops answering. The pane changes to the
  failure view without user input. Reload (button or 60-second countdown)
  then starts a new renderer and loads the workspace. This holds on macOS,
  Windows, and Linux.
- Smallest useful proof: Local UI repro in the installed build. A DevTools
  console loop hangs the page main thread. The unit spec
  `src/ui/main/serverView/hangRecovery.spec.ts` covers the ordering. The PR
  author checked a real page loop on a dev build only.

## Steps

| Step | Action | Test data | Expected result | Agent action |
| --- | --- | --- | --- | --- |
| 1 | Start the installed build. Make sure one signed-in workspace tab is selected in the tab strip at the top of the window. Do not use `yarn start`. | One workspace, signed in | The workspace page shows the room list and a room. | Start the installed app and select the workspace tab. |
| 2 | Right-click the selected workspace tab in the top tab strip. In the menu that opens, click `Open DevTools`. In the DevTools panel, click the `Console` tab. | | A DevTools panel opens with a console prompt at the bottom. | Open the tab context menu and choose `Open DevTools`. |
| 3 | Click the console prompt. Type the loop below and press Enter. Do not click the workspace page after this step. | `while(true){}` | The console prompt does not return. The workspace page does not react to the mouse. | Evaluate the loop in the workspace DevTools console. |
| 4 | Wait up to 30 seconds. Look at the main window. | | The workspace page is replaced by a full-pane failure view. It shows the text `Houston, we have a problem`, the text `Server Failed to Load`, and a blue button `Reload (N)` where N counts down from 60. | Wait. Capture the pane after 30 seconds and read the visible text. |
| 5 | Click the blue `Reload (N)` button while N is above 5. | | A small spinner replaces the button. Then the workspace page loads again and is signed in. The failure view is gone. | Click `Reload`. Capture the pane when it is loaded. |
| 6 | Click in the message composer of the workspace. Type a few letters. | `abc` | The letters appear in the composer. The page reacts to input. | Type in the composer and read it back. |
| 7 | Do steps 2 and 3 again. After the failure view shows, do not click anything. Wait until N reaches 0. | | At 0 the button changes to the spinner, and the workspace page loads again without any click. | Wait 60 seconds after the failure view shows. Check that the page loads. |
| 8 | Open the main log. On macOS, run `grep "became unresponsive" ~/Library/Logs/Rocket.Chat/main.log`. On Windows, open `%APPDATA%\Rocket.Chat\logs\main.log`. On Linux, open `~/.config/Rocket.Chat/logs/main.log`. | Log text `Server view became unresponsive` | The log has at least two lines with `Server view became unresponsive` and the workspace URL. | Search the log file for the line. |

## Evidence

- Screenshot of the failure view from step 4.
- Screenshot of the loaded workspace from step 5.
- The two log lines from step 8.
- Note the elapsed time between step 3 and the failure view.

## Failure Signals

- The pane stays frozen after 40 seconds.
- The pane turns blank grey with no failure view.
- `Reload` shows the spinner but the page never loads.
- The workspace page needs an app restart to work again.
- Step 7 never leaves the failure view at N = 0.
