---
id: CONF-QA-003
title: Reload and restart keep the workspace after a meeting
platforms: [windows, macos, linux]
priority: smoke
qase:
  suite: Conference call window
  priority: high
  severity: critical
  status: actual
  automation: manual
  qase_id: null
requires: [installed_branch_build, pexip_workspace_signed_in, video_calls_inside_app_on, test-links-html]
test_links:
  [
    'https://go.rocket.chat/conference?host=<workspace-host>&path=conference%2F<alias>%3Fscheduled%3Dtrue',
  ]
expected_result: Reload, force reload and an app restart after joining a meeting all show the workspace, never the meeting screen.
---

# Reload And Restart Keep The Workspace

## Review Basis

- Comparison range: `dev` to `fix/conference-deep-link-video-window`.
- Changed surface: Saved last page per workspace (`lastPath`,
  `src/servers/reducers.ts`, `src/ui/components/ServersView/ServerPane.tsx`).
- User-visible risk: The original report says a forced reload did not help and
  the meeting screen came back every time.
- Hypothesis: A conference page is never saved as the workspace's last page,
  so reloads and restarts land on a normal workspace page.
- Smallest useful proof: Local UI repro right after joining a meeting.

## Steps

| Step | Action | Test data | Expected result | Agent action |
| --- | --- | --- | --- | --- |
| 1 | In the main Rocket.Chat window, click any channel in the workspace's left room list and note the room name shown at the top of the room. | Any channel | A normal room with its message list is shown. | Open a channel and record its name. |
| 2 | In the browser, open `test-links.html`, fill in the workspace host and a valid scheduled-meeting alias, then click the link labelled `go.rocket.chat scheduled meeting link`. On the white go.rocket.chat page, click the blue `Desktop application` button; if the browser asks to open Rocket.Chat, click its open/allow button. | Workspace host, meeting alias | A separate call window opens with the meeting (`Chat` panel with `Add people` on the left). The main window still shows the room from step 1. Keep the call window open. | Open the link and hand off to the app. |
| 3 | In the main window, open the `View` menu in the menu bar (Windows/Linux: press Alt if the menu bar is hidden) and click `Reload`. | | The workspace reloads and shows the same room, not the meeting. | Trigger View > Reload. |
| 4 | Open the `View` menu again and click `Force reload`. | | The workspace reloads and shows a normal page, not the meeting. | Trigger View > Force reload. |
| 5 | Right-click the workspace's icon in the left server list (or its tab at the top) and click `Force reload`. | | Same as step 4. | Use the workspace context menu. |
| 6 | Quit Rocket.Chat completely (Windows: right-click the tray icon, `Quit`; macOS: `Rocket.Chat` menu, `Quit Rocket.Chat`), then start it again. | | The workspace opens on a normal page with the room list. The meeting screen does not appear. | Quit and relaunch. |

## Evidence

- Screenshot of the main window after steps 3, 4 and 6.

## Failure Signals

- Any reload or the restart shows the meeting screen or `You left the meeting`
  in the main window.
