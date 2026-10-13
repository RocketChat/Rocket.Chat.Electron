---
id: REL418-QA-020
title: Conference links open in the call window on the installed build
platforms: [windows, macos, linux]
priority: release
qase:
  suite: Release 4.18.0 / Video calls
  priority: high
  severity: major
  status: actual
  automation: manual
  qase_id: null
requires: [installed_prerelease_build, pexip_workspace_signed_in, video_calls_inside_app_on]
test_links: []
expected_result: A conference link opens a separate call window. The main window stays on the workspace after reload and restart.
---

# Conference Links Open In The Call Window On The Installed Build

## Review Basis

- Comparison range: `4.17.4..origin/dev` at `acaf3a712`.
- Changed surface: #3523 (the main process queues conference call pages per workspace. The workspace preload opens them with `openInternalVideoChatWindow`. The last-page rules never save a conference page). Files: `src/ui/main/serverView/conferenceWindow.ts`, `src/servers/preload/conferenceWindow.ts`, `src/deepLinks/main.ts`, `src/servers/common.ts`.
- User-visible risk: The meeting screen replaces the whole workspace and returns after every reload and restart. A workspace that is already stuck stays stuck.
- Hypothesis: On the installed build, a `conference/<alias>` link from a room opens the call window. The main window keeps its room. A reload and a restart do not bring the meeting back into the main window.
- Smallest useful proof: Manual run on the installed build. This flow is the short release gate. The full set is `CONF-QA-001` to `CONF-QA-006` in `qa/conference-call-window/`. The set covers the scheduled link (`CONF-QA-001`) and the in-room link (`CONF-QA-002`). It covers reload and restart (`CONF-QA-003`) and stuck workspace recovery (`CONF-QA-004`). It also covers cold start (`CONF-QA-005`) and the setting off (`CONF-QA-006`). Run those for deeper coverage. This flow needs a workspace with the Pexip conference experience.

## Steps

| Step | Action | Test data | Expected result | Agent action |
| --- | --- | --- | --- | --- |
| 1 | Start the installed Rocket.Chat app. In the left vertical server list, click the three-dots button near the bottom, click `Settings`, and click the `Voice & Video` tab. Find the row `Video calls inside app`. | Workspace with Pexip, signed in | The switch for `Video calls inside app` is on. | Open Settings and read the switch state. |
| 2 | Close Settings. In the workspace, click a channel in the left room list. Note the room name. | Any channel | A normal room with a message list is open. | Open a channel and record its name. |
| 3 | In the message composer, send a message with a conference link. Click the link in the sent message. | `https://<workspace-host>/conference/<alias>?scheduled=true` | A separate call window opens with its own title bar. It shows the meeting screen. | Send the link, click it, and find the new window. |
| 4 | Click the main Rocket.Chat window. | | The main window still shows the room from step 2 with the room list on the left. It does not show the meeting screen. | Capture the main window. |
| 5 | Close the call window. In the main window, press `Cmd+R` (macOS) or `Ctrl+R` (Windows, Linux). | | The main window reloads and shows the workspace room list. No call window opens. | Close the call window, reload, and capture. |
| 6 | Quit the app fully (`Cmd+Q` on macOS, `File > Quit` on Windows and Linux). Start it again. | | The app opens on the workspace, not on the meeting screen. No call window opens. | Quit, relaunch, and capture. |

## Evidence

- Screenshot of the call window at step 3.
- Screenshot of the main window at step 4 and step 6.

## Failure Signals

- The main window turns into the meeting screen with a narrow `Chat` panel.
- The meeting screen returns after step 5 or step 6.
- The link click does nothing.
