---
id: REL418-QA-040
title: Web UI preview stays hidden and idle with Developer Mode off
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
expected_result: A user who never turns on Developer Mode sees no web UI preview control, badge, or menu item, and the app starts no preview download.
---

# Web UI preview stays hidden and idle with Developer Mode off

## Review Basis

- Comparison range: 4.17.4..origin/dev at acaf3a712.
- Changed surface: #3525 (preview feature), #3534 (tab menu items), #3541 (Settings list moves to Appearance), #3536 and #3548 (package and boot-recovery code). Gate: the Settings section renders only when Developer Mode is on (`AppearanceSection.tsx`). IPC calls fail with "Developer Mode is off" (`rejectionOf` in `uiPreview.ts`). The tab menu items show only for a workspace with an active preview.
- User-visible risk: a normal user sees a new control, a new badge, a reload, or new network traffic after the update.
- Hypothesis: with Developer Mode off, Settings > Appearance has no "Load a web UI build" section. A workspace tab has no "UI" badge and no "Update UI preview" item. The workspace does not reload. The app creates no `ui-previews` folder in its data directory. Failure mode: any of these appears on Windows, macOS, or Linux.
- Known gap: the settings search lists Appearance for the text of the hidden setting (`SettingsWindow.tsx` does not filter by Developer Mode). Step 4 records it.
- Smallest useful proof: local UI repro on the installed build, plus a folder check. The `Restore server UI` item in View is present for every user (`menuBar.ts`). The flow checks that it does nothing without a preview. `clearUiOverride` returns when no override exists.

## Steps

| Step | Action | Test data | Expected result | Agent action |
| --- | --- | --- | --- | --- |
| 1 | Quit the app. Install the build under test over a profile that never used Developer Mode, or on a clean profile. Start the app. Add one workspace and sign in. | Any workspace you can sign in to. | The workspace loads and shows its normal chat page. | Start the app, add the workspace, and sign in. |
| 2 | Open the Help menu. Look at the item named Developer Mode. | None. | Developer Mode has no check mark. | Read the menu item state. |
| 3 | Open the app settings window. On macOS, use the app name menu at the top left, then Preferences. On Windows and Linux, use File, then App settings. In the left list, click Appearance (palette icon). Scroll to the bottom of the page. | None. | The page shows theme, navigation layout, and (on macOS) transparent window controls. No section titled "Load a web UI build" and no text box with the hint "develop, 42364 or http://127.0.0.1:4173/" shows. | Open Settings, select Appearance, and search the page text for "Load a web UI build". |
| 4 | In the settings window, click the search box at the top of the left list (placeholder "Search settings") and type `UI build`. If the list shows Appearance with the matching setting name, click it. | `UI build` | The search is not gated by Developer Mode, so Appearance can show with the matching name "Load a web UI build". After you click it, the page still has no "Load a web UI build" control. Record whether the match shows. | Type the text, read the list, open the match, and search the page text. |
| 5 | Close the settings window. Look at the workspace tab in the tab bar. Hover the tab for one second. | None. | The tab has no red badge with the letters "UI" at its bottom-right corner. The tooltip has no line that starts with "UI preview:". | Capture the tab and read the tooltip text. |
| 6 | Right-click the workspace tab. | None. | The menu shows no "Update UI preview" item and no "Restore server UI" item. Press Escape to close it. | Open the tab context menu and read the item labels. |
| 7 | Open the View menu. Click Restore server UI. Watch the workspace for 10 seconds. | None. | The workspace does not reload. Your place in the chat stays. No dialog shows. | Click the item. Compare the page before and after, and read the workspace URL and scroll position. |
| 8 | Open the Help menu and click Open Log Viewer. Search the log for the text `ui-preview` and for `ghcr.io`. | `ui-preview`, `ghcr.io` | The log has no line about a UI preview and no request to ghcr.io. | Read the log viewer text, or read the main log file. |
| 9 | Quit the app. In a file manager or shell, open the app data folder and look for a folder named `ui-previews`. The macOS folder is `~/Library/Application Support/Rocket.Chat`. The Windows folder is `%APPDATA%\Rocket.Chat`. The Linux folder is `~/.config/Rocket.Chat`. | Use `ls` on macOS and Linux, or `dir` on Windows. | No `ui-previews` folder exists in the app data folder. | Run the directory listing and check for the folder name. |

## Evidence

- Screenshot of Settings > Appearance, scrolled to the bottom.
- Screenshot of the tab context menu.
- Directory listing of the app data folder.
- Log search result for `ui-preview` and `ghcr.io`.

## Failure Signals

- A web UI build control shows with Developer Mode off.
- A "UI" badge, "Update UI preview" item, or reload shows without a preview.
- A `ui-previews` folder exists on a profile that never used the feature.
- A log line shows a request to ghcr.io or api.github.com.
