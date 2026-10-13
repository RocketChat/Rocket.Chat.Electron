---
id: REL418-QA-041
title: UI preview deep link is refused with Developer Mode off
platforms: [windows, macos, linux]
priority: release
qase:
  suite: Release 4.18.0 / Web UI previews
  priority: high
  severity: major
  status: actual
  automation: manual
  qase_id: null
requires: [installed_prerelease_build]
test_links: []
expected_result: A rocketchat://ui-preview link with Developer Mode off shows one information dialog and changes nothing.
---

# UI preview deep link is refused with Developer Mode off

## Review Basis

- Comparison range: 4.17.4..origin/dev at acaf3a712.
- Changed surface: #3525 and #3534 (`rocketchat://ui-preview` link handler in `deepLinks/main.ts` and `isUiPreviewAllowed` in `uiPreview.ts`).
- User-visible risk: any web page or message can open a `rocketchat://` link. A link that loads a different web UI for a user who never enabled Developer Mode is a security risk. A normal user can also see a surprise dialog.
- Hypothesis: with Developer Mode off, `rocketchat://ui-preview?develop` shows no confirmation, loads nothing, and does not reload the workspace. It shows a dialog titled "Load UI preview". The dialog text is "Enable Help > Developer Mode to load UI previews." Failure mode: the confirmation dialog shows on any platform. Or the workspace shows a "UI" badge on any platform.
- Smallest useful proof: OS-level repro with the installed build. A `targz` install does not register the link handler. For it, start the app binary with the link as the argument.

## Steps

| Step | Action | Test data | Expected result | Agent action |
| --- | --- | --- | --- | --- |
| 1 | Start the app with one workspace signed in. Open the Help menu. Make sure Developer Mode has no check mark. If it has one, click it once. | None. | Developer Mode has no check mark. | Read the menu item state and click it if it has a check mark. |
| 2 | Open a terminal. Run the command for your OS. On macOS: `open 'rocketchat://ui-preview?develop'`. On Windows (cmd): `start "" "rocketchat://ui-preview?develop"`. On Linux: `xdg-open 'rocketchat://ui-preview?develop'`. | `rocketchat://ui-preview?develop` | The app window comes to the front. One dialog shows. Its title is "Load UI preview". Its text is "Enable Help > Developer Mode to load UI previews." The dialog has an OK button. | Run the command and read the dialog title and text. |
| 3 | Click OK in the dialog. | None. | The dialog closes. No second dialog shows. No dialog with the buttons "Load UI" and "Cancel" shows. | Click OK and check for other dialogs. |
| 4 | Look at the workspace tab and the workspace page. Hover the tab. | None. | The workspace did not reload. The tab has no red "UI" badge. The tooltip has no line that starts with "UI preview:". | Capture the tab and read the tooltip. |
| 5 | Run the command again with a pull request link: `rocketchat://ui-preview?pr=42364`. | `rocketchat://ui-preview?pr=42364` | The same information dialog shows. Click OK. Nothing else changes. | Run the command and read the dialog. |
| 6 | Open the app data folder (macOS `~/Library/Application Support/Rocket.Chat`, Windows `%APPDATA%\Rocket.Chat`, Linux `~/.config/Rocket.Chat`). Look for a folder named `ui-previews`. | None. | No `ui-previews` folder exists. | List the folder. |

## Evidence

- Screenshot of the information dialog.
- Screenshot of the workspace tab after the dialog closes.
- Directory listing of the app data folder.

## Failure Signals

- The "Load UI" and "Cancel" dialog shows with Developer Mode off.
- The workspace reloads or shows a "UI" badge.
- A `ui-previews` folder appears.
- No dialog shows at all (the app drops the link with no feedback).
