---
id: REL418-QA-047
title: A running web UI preview does not trigger boot-recovery reloads or request stalls
platforms: [windows, macos, linux]
priority: high
qase:
  suite: Release 4.18.0 / Web UI previews
  priority: high
  severity: major
  status: actual
  automation: manual
  qase_id: null
requires: [installed_prerelease_build]
test_links: []
expected_result: A workspace with a preview loads once, stays loaded for 2 minutes, keeps its cookies, and still answers after the page cancels requests.
---

# A running web UI preview does not trigger boot-recovery reloads or request stalls

## Review Basis

- Comparison range: 4.17.4..origin/dev at acaf3a712.
- Changed surface: #3548 (`injected.ts` boot recovery skip through `isUiPreviewActive()`, abort of cancelled requests in `uiOverride.ts`), #3525 (preview serving).
- User-visible risk: before the fix, each preview load reloaded the workspace twice after 30 seconds and cleared its cache, cookies, and IndexedDB. After some use, rooms did not open and messages did not send while the socket stayed connected.
- Hypothesis: with a preview applied, the workspace does not reload on its own for 2 minutes and you stay signed in. The log has one warning that boot recovery is skipped, and no recovery reload. After you cancel several media loads, rooms still open and messages still send. A workspace with no preview still recovers from a wedged boot as before. Failure mode: a reload at about 30 seconds, a lost session, or a room that stops loading. Platforms: every platform. The author tested macOS only.
- Smallest useful proof: local UI repro with a timer, plus the log. The stall needs a room with a large video attachment. If your workspace has none, step 6 is blocked. The unit tests of #3548 cover the abort.

## Steps

| Step | Action | Test data | Expected result | Agent action |
| --- | --- | --- | --- | --- |
| 1 | Start the app with one workspace signed in. Open the Help menu and make sure Developer Mode has a check mark. Open Help, then Open Log Viewer, and keep that window open to the side. | None. | The Log Viewer window shows log lines. | Open the Log Viewer. |
| 2 | Open the app settings window (macOS: app name menu, Preferences. Windows and Linux: File, App settings). Click Appearance (palette icon), scroll to "Load a web UI build", add `develop`, click Apply, and click Load UI. Close Settings. Start a timer. | `develop` | The workspace tab shows a red "UI" badge. The web client loads and you are signed in. | Apply and start the timer. |
| 3 | Watch the workspace for 2 minutes without a click. | None. | The page does not reload and does not go blank at 30 seconds, 60 seconds, or 90 seconds. You stay signed in. Typing in the message box still works. | Capture the page at each time and compare the page title and scroll position. |
| 4 | In the Log Viewer, search for `window.require`. | `window.require` | One line reads "The UI preview client has no window.require; desktop integrations are off and boot recovery is skipped." The line shows once for each page load. No line says boot recovery is clearing data or reloading the server. | Search the log and count the lines. |
| 5 | Open the View menu and click Reload (or press the reload key shown on the item). Wait 40 seconds. | None. | The page reloads once. It stays on the web client. You stay signed in. The warning from step 4 shows once more. | Reload, wait, and read the log. |
| 6 | Open a room that has a large video attachment. Scroll the attachment into view, then scroll it away at once. Do this 15 times. Then open three other rooms one after the other and send a message in one. | A room with a video larger than 20 MB. | After all the scrolls, each room opens within 5 seconds and the message sends. No room stays on a loading spinner. | Repeat the scroll, then open rooms and send the message. |
| 7 | Open the View menu and click Restore server UI. Wait 40 seconds. | None. | The server UI loads, you stay signed in, and the page does not wait with no end. The badge goes away. | Restore and capture the page. |
| 8 | Without a preview, wait 2 minutes with the workspace open. | None. | The workspace stays loaded. The log has no recovery reload. | Wait and read the log. |

## Evidence

- Page screenshots at 30, 60, and 90 seconds.
- Log Viewer lines for `window.require`.
- The size of the video used in step 6, or the reason step 6 is blocked.

## Failure Signals

- The workspace reloads about 30 seconds after Apply.
- You must sign in again, or the workspace loses its data.
- A room stays on a spinner after you cancel media loads.
- Restore server UI waits with no end.
