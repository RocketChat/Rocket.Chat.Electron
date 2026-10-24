---
id: CONF-QA-001
title: Scheduled meeting link opens in the call window
platforms: [windows, macos, linux]
priority: smoke
qase:
  suite: Conference call window
  priority: high
  severity: critical
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
expected_result: Choosing Desktop application on the go.rocket.chat page opens the meeting in a separate call window while the main window keeps showing the workspace.
---

# Scheduled Meeting Link Opens In The Call Window

## Review Basis

- Comparison range: `dev` to `fix/conference-deep-link-video-window`.
- Changed surface: `rocketchat://conference` deep-link routing
  (`src/deepLinks/main.ts`) and the server-view conference queue
  (`src/ui/main/serverView/conferenceWindow.ts`,
  `src/servers/preload/conferenceWindow.ts`).
- User-visible risk: The meeting page replaces the whole workspace in the main
  window and cannot be left (the original report).
- Hypothesis: A `conference/<alias>?scheduled=true` link opens in the call
  window, signed in, and the main window is not navigated.
- Smallest useful proof: OS-level repro through the go.rocket.chat page and
  the installed app's protocol handler.

## Steps

| Step | Action | Test data | Expected result | Agent action |
| --- | --- | --- | --- | --- |
| 1 | In the main Rocket.Chat window, click any channel in the workspace's left room list so a normal room is open. Note the room name shown at the top of the room. | Any channel | A normal room with its message list is shown; the workspace sidebar with the room list is visible on the left. | Open a channel and record its name. |
| 2 | In the browser, open `test-links.html`, fill in the workspace host and a valid scheduled-meeting alias, then click the link labelled `go.rocket.chat scheduled meeting link`. | Workspace host, meeting alias | A white go.rocket.chat page opens with the Rocket.Chat logo, the text `Where do you want to open this link?`, the workspace link in blue, and two blue buttons: `Desktop application` and `Web application`. | Open the generated go.rocket.chat URL. |
| 3 | Click the blue `Desktop application` button in the middle of the page. If the browser shows a prompt asking to open Rocket.Chat, click its open/allow button. | | Rocket.Chat comes to the front. | Click `Desktop application`; accept the protocol prompt. |
| 4 | Look for a new, separate window (it has its own title bar and taskbar/dock entry, next to the main Rocket.Chat window). | | A separate call window shows the meeting: a `Chat` panel on the left with an `Add people` button (`Personen hinzufügen` in German) and the meeting video area on the right. No login screen and no "not authorized" message appears in it. | Find the new call window and capture it. |
| 5 | Switch back to the main Rocket.Chat window. | | The main window still shows the room from step 1 with the workspace sidebar and room list. It does NOT show the meeting, the `Chat` / `Add people` panel, or `You left the meeting`. | Capture the main window. |
| 6 | In the call window, leave the meeting with the meeting's own hang-up control. | | `You left the meeting` (`Sie haben das Meeting verlassen`) appears only inside the call window. The main window is unchanged. | Hang up in the call window. |
| 7 | Close the call window, then click another channel in the main window. | | The call window closes. The main window navigates normally. | Close call window; open another room. |

## Evidence

- Screenshot of the call window at step 4.
- Screenshot of the main window at step 5 and step 7.

## Failure Signals

- The main window turns into the meeting screen (full-width meeting area with
  a narrow `Chat` panel, no room list).
- The call window shows a login page or `You are not authorized to view this
page`.
- Nothing happens after clicking `Desktop application` while Rocket.Chat is
  running.
