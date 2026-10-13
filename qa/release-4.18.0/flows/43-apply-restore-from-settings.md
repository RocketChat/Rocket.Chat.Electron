---
id: REL418-QA-043
title: Apply and restore a web UI build from Settings
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
expected_result: Apply asks for confirmation, loads the build into the workspace with a UI badge and commit label, keeps the session, and Restore server UI returns the server UI.
---

# Apply and restore a web UI build from Settings

## Review Basis

- Comparison range: 4.17.4..origin/dev at acaf3a712.
- Changed surface: #3525 (confirmation dialog, `uiOverride.ts` serving, tab badge). #3541 (Apply and Restore in Settings), #3536 (commit in the label). #3534 (`develop`). #3548 (abort of loads on restore).
- User-visible risk: the preview does not load. The session is lost. The workspace never returns to the server UI. The first load after Restore waits with no end.
- Hypothesis: after Apply and Load UI, the workspace page loads the web client build and stays signed in. The tab shows a red "UI" badge, and the tooltip shows "UI preview: develop @ <7-character commit> (ghcr.io/rocketchat/rocket.chat-web:develop)". Restore server UI reloads the server's own UI, removes the badge, and the page boots in under 40 seconds. Failure mode: blank page, login prompt, or hang. This runs on every platform.
- Smallest useful proof: local UI repro on the installed build against a workspace you control.
- Open point from the PRs: the full flow in a packaged app was not run by the author of #3525. This flow is that run. The in-page "UI preview" badge in the #3525 text is not in the code. The tab badge replaces it.

## Steps

| Step | Action | Test data | Expected result | Agent action |
| --- | --- | --- | --- | --- |
| 1 | Start the app with one workspace signed in. Open the Help menu and make sure Developer Mode has a check mark. Open the app settings window, click Appearance, and scroll to "Load a web UI build". Add `develop` to the list (type it, click Add). | `develop` | A row named "develop" shows with an Apply button. | Prepare the state and read the row. |
| 2 | Click Apply on the "develop" row. | None. | A native dialog shows with a warning icon. Its title is "Load UI preview". Its text is `Load a different web UI for "<workspace address>"?`. Its detail names `develop (ghcr.io/rocketchat/rocket.chat-web:develop)` and says it runs with your session. The buttons are "Load UI" and "Cancel". "Cancel" is the default. | Click Apply and read the dialog. |
| 3 | Click Cancel. | None. | The dialog closes. Text under the row reads "Cancelled." The workspace tab has no "UI" badge. | Click Cancel and read the row text. |
| 4 | Click Apply again. Click Load UI. | None. | The row shows "Downloading and applying…" and a spinner on Apply. The app stays responsive. After a few seconds the row text goes away. | Click Load UI and watch the row. |
| 5 | Look at the workspace row for your workspace in the same section. | None. | The row text is green: "Active on this workspace: develop @ <7 characters> (ghcr.io/rocketchat/rocket.chat-web:develop)". The Restore server UI button is enabled. The "develop" list row shows "Active on <workspace name>". | Read both texts. |
| 6 | Close the settings window. Look at the workspace tab. Hover it for one second. | None. | A red badge with the letters "UI" shows at the bottom-right corner of the tab. The tooltip has a last line "UI preview: develop @ <7 characters> (ghcr.io/rocketchat/rocket.chat-web:develop)". | Capture the tab and read the tooltip. |
| 7 | Look at the workspace page. Wait 40 seconds. | None. | The web client shows and you are still signed in. No login page shows. Room list and messages load. | Capture the page and check for the room list. |
| 8 | Open a room. Send a short message. Open the room list and open a second room. | `QA preview test` | The message sends and shows in the room. The second room opens. | Send the message and open the room. |
| 9 | Open the app settings window, click Appearance, scroll down, and click Restore server UI on your workspace row. | None. | The workspace page reloads. The row text becomes "Using the server's UI." The Restore button is disabled. The tab loses its "UI" badge. | Click the button and read the row and tab. |
| 10 | Close the settings window. Wait 40 seconds. | None. | The server's own web UI loads and you are still signed in. The page does not wait with no end. | Capture the page and check the room list. |

## Evidence

- Screenshot of the confirmation dialog.
- Screenshot of the tab with the "UI" badge and its tooltip.
- Screenshot of the workspace page with the preview and after Restore.
- Main log lines for the apply, if shown.

## Failure Signals

- Apply loads with no confirmation dialog.
- The workspace asks you to sign in again after Load UI.
- The page is blank or shows a loading spinner for more than 40 seconds, with or without the preview.
- The "UI" badge stays after Restore server UI.
- The label has no commit after the pull.
