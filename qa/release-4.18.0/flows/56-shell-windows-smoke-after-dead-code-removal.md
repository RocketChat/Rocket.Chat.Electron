---
id: REL418-QA-056
title: Settings, Downloads And Log Viewer Windows Work After The Dead Code Removal
platforms: [windows, macos, linux]
priority: medium
qase:
  suite: Release 4.18.0 / App shell
  priority: medium
  severity: normal
  status: actual
  automation: manual
  qase_id: null
requires: [installed_prerelease_build, logged_in_session]
test_links: []
expected_result: The settings window, the downloads window and the log viewer open from the menu, the shortcuts and the workspace bar. The app keeps the last workspace after a restart, and quits cleanly.
---

# Settings, Downloads And Log Viewer Windows Work After The Dead Code Removal

## Review Basis

- Comparison range: 4.17.4..origin/dev at acaf3a712. Build under test: 4.18.0-alpha.6.
- Changed surface: #3514 (removal of the in-shell settings and downloads views, the old certificates manager UI, and the in-pane document viewer). #3514 also removes the reducers `isSideBarEnabled`, `isBugsnagEnabled` and `lastSelectedServerUrl`. `currentView` no longer has `settings` and `downloads`. #3515 (log viewer: removed `logFormatters`, `textHighlight`, unused constants and the timeline `newestIndex` field). The log viewer now has a shared helper `resolveAuthorizedLogPath` in `src/logViewerWindow/ipc.ts`. #3516 (removed `markMainWindowStable`, `installDevTools`, `getPlatformName`, and two specs).
- User-visible risk: These PRs remove code and promise no change. The risk is one of these. A window no longer opens. The Window menu has a wrong check mark. A Certificates section does not load. The log viewer cannot show or open a log file. The last workspace is lost after a restart.
- Hypothesis: Every window that the removed code once served still opens and works on all platforms, and the app starts and quits as before.
- Smallest useful proof: Targeted unit specs from the PRs and one smoke pass. No flow per PR is necessary. This flow is the smoke surface for #3514, #3515 and #3516.

## Steps

| Step | Action | Test data | Expected result | Agent action |
| --- | --- | --- | --- | --- |
| 1 | Start the installed app with two workspaces added. Click the second workspace in the workspace list. | Two workspaces | The second workspace shows. No error dialog shows at startup. | Start the app and read the active workspace. |
| 2 | Open the settings window: press `Ctrl+,` (macOS: `Cmd+,`). Open the "Window" menu in the menu bar. | None | A window titled "App settings" opens. In the "Window" menu, the item "App settings" has a check mark. | Press the shortcut and read the menu state. |
| 3 | In the settings window, click each item in the left list: "General", "Appearance", "Certificates", "Telephony", "Video calls", "Advanced". | None | Each section loads its controls. No section is empty or shows an error. | Click each item and capture a screenshot. |
| 4 | Close the settings window. Open the "Window" menu. | None | The check mark of "App settings" is gone. | Read the menu state. |
| 5 | Open the downloads window: press `Ctrl+D` (macOS: `Cmd+D`). Open the "Window" menu. | None | A window titled "Downloads" opens. In the "Window" menu, the item "Downloads" has a check mark. | Press the shortcut and read the menu state. |
| 6 | Close the downloads window. In the workspace, send a file in a room, then click the file link to download it. Open the downloads window again. | One small file | The file shows in the list of the downloads window with its name. | Download a file and read the list. |
| 7 | Open the log viewer: click the "Help" menu, "Open Log Viewer". | None | A window titled "Log Viewer" opens. It lists log entries and the label "Live" shows. | Press `Ctrl+Shift+L` and read the entries. |
| 8 | In the log viewer, type `Starting` in the field "Search logs...".  Click an entry with the "+N more lines" text, then click "Show less". Click the button "Save". | `Starting` | The list filters to matching entries. The viewer highlights matching text. A long entry expands and collapses. The button "Save" writes a file or shows the label "Saved". | Type, click and read the list. |
| 9 | In the log viewer click "Open log file" and choose the main log file in the file dialog. Click "Default log" afterwards. | Main log file | The chosen file loads and "Default log" returns to the main log. The viewer does not crash. | Choose the file and read the result. |
| 10 | Quit the app (`Cmd+Q` on macOS, "File" menu, "Quit Rocket.Chat" on Windows and Linux). Start it again. | None | The app starts with the second workspace selected as before. No error dialog shows. | Restart and read the active workspace. |

## Evidence

- Screenshots of the three windows and of the "Window" menu check marks.
- The platform and the package type.

## Failure Signals

- A shortcut or menu item does not open its window.
- A check mark in the "Window" menu does not match the window state.
- The "Certificates" section is empty or shows an error.
- The log viewer shows no entries, cannot open a log file, or crashes.
- The app picks the wrong workspace after a restart, or shows an error at startup or at quit.
