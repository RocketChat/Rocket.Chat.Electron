---
id: REL418-QA-031
title: Failure view clears when the page recovers and also appears for a background workspace
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
expected_result: The failure view disappears when a stalled page answers again, and a stalled workspace in the background shows the failure view when the user opens its tab.
---

# Failure View Clears On Self-Recovery And Covers Background Workspaces

## Review Basis

- Comparison range: 4.17.4..origin/dev at acaf3a712.
- Changed surface: #3533. The heartbeat probe runs every 5 seconds, flags a
  stall after 15 seconds, and sends `WEBVIEW_BECAME_RESPONSIVE` when the page
  answers late.
- User-visible risk: The failure view stays on screen after the page recovers.
  A hidden workspace that hangs is not noticed until the user clicks in it.
- Hypothesis: A page that is stuck for 40 seconds shows the failure view and
  then returns to the normal page with no click on Reload. A hung workspace
  that is not selected shows the failure view when its tab is selected.
- Smallest useful proof: Local UI repro with two workspaces in the installed
  build and two DevTools console loops.

## Steps

| Step | Action | Test data | Expected result | Agent action |
| --- | --- | --- | --- | --- |
| 1 | Start the installed build with two signed-in workspaces. They show as two tabs in the strip at the top of the window. Select the first tab. | Workspace A and workspace B | Workspace A shows its room list. | Start the app and select tab A. |
| 2 | Right-click tab A. Click `Open DevTools`. In the DevTools panel, click the `Console` tab. Type the command and press Enter. Do not click the workspace page after this step. | `const end=Date.now()+40000;while(Date.now()<end){}` | The workspace page stops reacting. | Evaluate the 40-second loop in the console of workspace A. |
| 3 | Wait. Look at the main window every 5 seconds. | | Between 15 and 30 seconds, the pane changes to the failure view: `Houston, we have a problem`, `Server Failed to Load`, and a blue button `Reload (N)`. | Capture the pane at 30 seconds. |
| 4 | Keep waiting. Do not click `Reload`. The loop ends at 40 seconds. | | Within 10 seconds after the loop ends, the failure view disappears and the workspace page shows again. The page keeps its room and its scroll position. No new page load is needed. | Capture the pane at 55 seconds. |
| 5 | Right-click tab A. Click `Open DevTools` if the panel is closed. In the `Console` tab, type the command and press Enter. | `while(true){}` | The workspace page stops reacting. | Evaluate the endless loop in workspace A. |
| 6 | Click tab B in the top tab strip at once. Work in workspace B for 30 seconds. Open a room and type in the composer. | | Workspace B reacts to input. Tab B is selected. | Select tab B and type in its composer. |
| 7 | Click tab A. | | Workspace A shows the failure view (`Server Failed to Load`). It does not show a frozen page. | Select tab A and capture the pane. |
| 8 | Click the blue `Reload (N)` button. | | The spinner shows. Then workspace A loads again and is signed in. | Click `Reload` and capture the loaded page. |

## Evidence

- Screenshots of steps 3, 4, 7, and 8.
- Note the time when the failure view appeared and when it cleared in step 4.

## Failure Signals

- The failure view stays after the loop ends in step 4.
- The failure view never shows in step 3.
- Tab A shows a frozen page in step 7.
- Workspace B freezes together with workspace A.
