---
id: CONF-QA-005
title: Scheduled meeting link opens the call window when the app is closed
platforms: [windows, macos, linux]
priority: smoke
qase:
  suite: Conference call window
  priority: high
  severity: major
  status: actual
  automation: manual
  qase_id: null
requires:
  [
    installed_branch_build,
    pexip_workspace_signed_in,
    video_calls_inside_app_on,
    test-links-html,
  ]
test_links:
  [
    'https://go.rocket.chat/conference?host=<workspace-host>&path=conference%2F<alias>%3Fscheduled%3Dtrue',
  ]
expected_result: With Rocket.Chat fully closed, the link starts the app and opens the meeting in the call window exactly once.
---

# Link Cold-Starts The App

## Review Basis

- Comparison range: `dev` to `fix/conference-deep-link-video-window`.
- Changed surface: Pull-based handoff from the main process to the workspace
  preload (`server-view/take-pending-conference`).
- User-visible risk: When the link itself launches the app, the request is
  lost before the workspace is ready, or the meeting opens twice.
- Hypothesis: The queued request is picked up once the workspace loads and
  opens exactly one call window.
- Smallest useful proof: OS-level repro with the app closed.

## Steps

| Step | Action | Test data | Expected result | Agent action |
| --- | --- | --- | --- | --- |
| 1 | Quit Rocket.Chat completely (Windows: right-click the tray icon, `Quit`; macOS: `Rocket.Chat` menu, `Quit Rocket.Chat`). Confirm no Rocket.Chat icon remains in the tray/dock. | | Rocket.Chat is not running. | Quit the app. |
| 2 | In the browser, open `test-links.html`, fill in the workspace host and a valid scheduled-meeting alias, click the link labelled `go.rocket.chat scheduled meeting link`, then click the blue `Desktop application` button and accept the browser's open prompt. | Workspace host, meeting alias | Rocket.Chat starts. | Open the link and hand off to the app. |
| 3 | Wait for the main window to finish loading the workspace (up to about 30 seconds). | | One separate call window opens with the meeting (`Chat` panel with `Add people` on the left). The main window shows the workspace with its room list. | Count call windows; capture both windows. |

## Evidence

- Screenshot of both windows after step 3.

## Failure Signals

- Rocket.Chat starts but no call window ever opens.
- Two call windows open, or the main window shows the meeting screen.
