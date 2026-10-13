---
id: REL418-QA-036
title: https go.rocket.chat links passed to the app open the workspace page
platforms: [windows, macos, linux]
priority: medium
qase:
  suite: Release 4.18.0 / Workspaces
  priority: medium
  severity: normal
  status: actual
  automation: manual
  qase_id: null
requires: [installed_prerelease_build]
test_links: []
expected_result: A go.rocket.chat room or invite link given to the installed app as a command-line argument opens that page in the matching workspace, the same as the rocketchat:// link.
---

# go.rocket.chat Links Given To The App

## Review Basis

- Comparison range: 4.17.4..origin/dev at acaf3a712.
- Changed surface: #3518. `parseDeepLink` in `src/deepLinks/main.ts` now
  removes the leading `/` of the `go.rocket.chat` path, so `/room` matches
  the `room` case.
- User-visible risk: The app receives an `https://go.rocket.chat/<action>`
  link and ignores it. The window comes to the front and nothing opens.
- Hypothesis: When the app starts, or runs, with an
  `https://go.rocket.chat/room?...` or `.../invite?...` argument, it selects
  the workspace and loads the room or invite page. An unknown workspace asks
  before it adds the workspace.
- Smallest useful proof: Local OS-level repro. The installed app does not
  register `https` links, so the only reachable path is a command-line
  argument (the second-instance and cold-start paths). The PR adds unit specs
  for `auth`, `room`, `invite`, `conference`, and SAML links.
  `rocketchat://` links already worked. The browser page at go.rocket.chat
  opens `rocketchat://` links and does not use this path. See CONF-QA-001.

## Steps

| Step | Action | Test data | Expected result | Agent action |
| --- | --- | --- | --- | --- |
| 1 | Start the installed build. Select a signed-in workspace tab. Open a room other than `general`. Write down the workspace address as `<host>`, for example `https://chat.example.com`. | A workspace `<host>` with a public channel named `general` | The workspace shows the other room. | Start the app and select the workspace. |
| 2 | Open a terminal. Run the installed app executable with the room link as the only argument. macOS: `"/Applications/Rocket.Chat.app/Contents/MacOS/Rocket.Chat" "<link>"`. Windows PowerShell: `& "$env:LOCALAPPDATA\Programs\Rocket.Chat\Rocket.Chat.exe" "<link>"` (for an all-users install use `C:\Program Files\Rocket.Chat\Rocket.Chat.exe`). Linux: `rocketchat-desktop "<link>"` (AppImage: run the `.AppImage` file). | `https://go.rocket.chat/room?host=<host>&path=channel/general` | The command returns. The Rocket.Chat window comes to the front. The workspace page loads the room `general`. The room name `general` shows in the room header. | Run the command. Capture the window. |
| 3 | Run the same command with the invite link. | `https://go.rocket.chat/invite?host=<host>&path=invite/abc123` | The workspace page loads an invite page. A bad invite shows an error text about the invite. | Run the command. Capture the window. |
| 4 | Run the command with the custom protocol link as a control. | `rocketchat://room?host=<host>&path=channel/general` | The room `general` loads, the same as in step 2. | Run the command. Capture the window. |
| 5 | Run the command with a link to a workspace that is not in the app. Use another valid Rocket.Chat address. | `https://go.rocket.chat/room?host=<other-host>&path=channel/general` | A dialog titled `Add Server` asks `Do you want to add "<other-host>" to your list of servers?` with the buttons `Add` and `Cancel`. Click `Cancel`. No tab is added. | Run the command. Capture the dialog. Click `Cancel`. |
| 6 | Quit the app (Cmd+Q on macOS, File > Quit on Windows and Linux). Run the command from step 2 again. | `https://go.rocket.chat/room?host=<host>&path=channel/general` | The app starts. After the workspace loads, the room `general` shows. | Quit. Run the command. Capture the window after 30 seconds. |
| 7 | Only on a workspace set up as in CONF-QA-001. Run the command with a scheduled meeting link. | `https://go.rocket.chat/conference?host=<host>&path=conference%2F<alias>%3Fscheduled%3Dtrue` | A separate call window opens. The main window keeps the workspace page. | Run the command. Capture both windows. |

## Evidence

- Screenshot of the room header after step 2 and step 6.
- Screenshot of the `Add Server` dialog from step 5.
- The exact command that you ran on each platform.

## Failure Signals

- The window comes to the front but the page does not change.
- Step 2 loads a page and step 4 does not, or the reverse.
- The app adds the workspace in step 5 without the dialog.
- The app starts in step 6 and ignores the link.
