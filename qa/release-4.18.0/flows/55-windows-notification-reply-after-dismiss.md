---
id: REL418-QA-055
title: Windows Notification Reply Still Reaches The Room After The Banner Is Dismissed
platforms: [windows]
priority: release
qase:
  suite: Release 4.18.0 / App shell
  priority: high
  severity: major
  status: actual
  automation: manual
  qase_id: null
requires: [installed_prerelease_build, logged_in_session, second_account_for_messages]
test_links: []
expected_result: A reply typed in the Action Center card after the banner timed out posts to the same room. The sender sees it on the server.
---

# Windows Notification Reply Still Reaches The Room After The Banner Is Dismissed

## Review Basis

- Comparison range: 4.17.4..origin/dev at acaf3a712. Build under test: 4.18.0-alpha.6.
- Changed surface: #3519 (`src/notifications/preload.ts` keeps the reply handlers on win32 after a dismiss. It releases them on reply, on action, or at a limit of 200 entries. `src/notifications/main.ts` icon error log). Background: the Windows notification facts in `AGENTS.md`, section "Windows Notifications".
- User-visible risk: The banner times out and the web page closes the notification. The preload then dropped its handler. A reply typed later in the Action Center card posted nothing.
- Hypothesis: A reply typed in an Action Center card, after the banner closed, reaches the room. A second reply to the same card does not post twice.
- Smallest useful proof: Preload specs for retention on win32, release on reply and the limit of 200. The PR author did not run a real Action Center test. A spec cannot see the toast, so this flow checks the reply on the server. Enter does not submit a toast reply. Only the Reply button of the toast does.

## Steps

| Step | Action | Test data | Expected result | Agent action |
| --- | --- | --- | --- | --- |
| 1 | Start the installed app on Windows. Sign in to a workspace with account A. Turn off Windows Focus Assist and "Do not disturb". | Account A in the app, account B in a browser | The main window shows the workspace. | Start the app and sign in. |
| 2 | In a browser, sign in as account B. Open a direct message to account A. Put the app window in the background: click another app so the Rocket.Chat window is not in front. | Account B in the browser | The app window is not focused. | Focus another window. |
| 3 | As account B, send the message `reply test 1`. Watch the bottom-right of the screen. | `reply test 1` | A toast banner shows with the text of the message and a text field with a "Reply" button. | Send the message and capture the screen. |
| 4 | Wait until the banner leaves the screen without a click. This takes about 10 seconds or more. Do not click the toast. | None | The banner is gone. | Wait and capture the screen. |
| 5 | Press `Win+N` to open the notification center. Find the card for the message `reply test 1`. Click the text field in the card. Type `reply from action center`. Click the "Reply" button in the card. Do not press Enter. | `reply from action center` | The card closes after the click. | Open the center and click through the card. |
| 6 | In the browser as account B, look at the direct message with account A. | None | The message `reply from action center` shows as sent by account A within a few seconds. It shows once only. | Query the room messages by the server API. |
| 7 | Repeat steps 3 to 6 with the message `reply test 2` in a different room, if the second account has one. Wait 2 minutes before step 5. | `reply test 2`, a wait of 2 minutes | The reply posts to the room of that notification, not to the room of step 6. | Query both rooms by the server API. |
| 8 | Open the app log: click the "Help" menu, "Open Log Viewer". Search for `reply`. | `reply` | No line says the app dropped a reply. | Search the log and read the lines. |

## Evidence

- Screenshots of the toast (step 3) and of the Action Center card (step 5).
- The server messages of the two rooms with their time stamps.
- The log search result of step 8.

## Failure Signals

- The reply does not appear on the server.
- The reply appears in the wrong room, or twice.
- The log has a line about a dropped reply or activation.
- Clicking the toast body does not bring the app window to the front.
