---
id: CONF-QA-006
title: Scheduled meeting link opens in the browser when video calls inside app is off
platforms: [windows, macos, linux]
priority: regression
qase:
  suite: Conference call window
  priority: medium
  severity: major
  status: actual
  automation: manual
  qase_id: null
requires: [installed_branch_build, pexip_workspace_signed_in, test-links-html]
test_links:
  [
    'https://go.rocket.chat/conference?host=<workspace-host>&path=conference%2F<alias>%3Fscheduled%3Dtrue',
  ]
expected_result: With Video calls inside app switched off, the meeting opens in the default browser and the main window keeps the workspace.
---

# Video Calls Inside App Switched Off

## Review Basis

- Comparison range: `dev` to `fix/conference-deep-link-video-window`.
- Changed surface: The conference request reuses
  `openInternalVideoChatWindow`, which honors the `Video calls inside app`
  setting (and always uses the browser on Mac App Store builds).
- User-visible risk: Turning the setting off brings back the meeting screen in
  the main window, or nothing opens at all.
- Hypothesis: The meeting opens in the default browser; the main window is not
  navigated.
- Smallest useful proof: Local UI repro with the setting off.

## Steps

| Step | Action | Test data | Expected result | Agent action |
| --- | --- | --- | --- | --- |
| 1 | In the left vertical server list, click the three-dots/kebab button near the bottom edge below the server buttons, click `Settings`, click the `Voice & Video` tab near the top, and switch `Video calls inside app` off. | | The toggle is off. | Disable the setting. |
| 2 | Run CONF-QA-001 steps 1-3. | Workspace host, meeting alias | The meeting opens in the default web browser. No separate Rocket.Chat call window opens. | Open the link. |
| 3 | Switch back to the main Rocket.Chat window. | | The main window still shows the room with the room list. | Capture the main window. |
| 4 | Switch `Video calls inside app` back on. | | The toggle is on. | Restore the setting. |

## Evidence

- Screenshot of the browser tab and of the main window.

## Failure Signals

- The main window shows the meeting screen.
- Nothing opens.
