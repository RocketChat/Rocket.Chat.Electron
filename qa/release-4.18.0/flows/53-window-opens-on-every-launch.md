---
id: REL418-QA-053
title: App Window Opens On Every Launch, And --start-hidden Keeps The Tray Start
platforms: [windows, macos, linux]
priority: release
qase:
  suite: Release 4.18.0 / App shell
  priority: high
  severity: major
  status: actual
  automation: manual
  qase_id: null
requires: [installed_prerelease_build]
test_links: []
expected_result: After the user quits while the window is hidden in the tray, the next normal launch shows the window. A launch with --start-hidden and the tray icon on starts with the window hidden. The log records the window decision.
---

# App Window Opens On Every Launch, And --start-hidden Keeps The Tray Start

## Review Basis

- Comparison range: 4.17.4..origin/dev at acaf3a712. Build under test: 4.18.0-alpha.6.
- Changed surface: #3535 (shipped in 4.17.4: `showRootWindow` and `applyRootWindowState` in `src/ui/main/rootWindow.ts`, startup logging in `src/main.ts`, second-launch logging in `src/deepLinks/main.ts`).
- User-visible risk: The user quits while the window is hidden in the tray. The next launch shows only a tray icon. On Windows the icon can sit in the overflow area, so the app looks like it never started.
- Hypothesis: A normal launch always shows the window. Only `--start-hidden` with the tray icon on keeps it hidden. The main log shows the start line and the "Root window state applied" line.
- Smallest useful proof: New specs in `rootWindow.spec.ts`. The PR author left the dev-app check unchecked, so this flow does it on the installed build.

## Steps

| Step | Action | Test data | Expected result | Agent action |
| --- | --- | --- | --- | --- |
| 1 | Start the installed app. Open the settings window (macOS: "Rocket.Chat" menu, "Preferences". Windows and Linux: `Ctrl+,`). In the left list click "General". Find the toggle "Tray icon" (macOS: "Menu bar extra"). Turn it on. Close the settings window. | Tray icon on | The tray icon shows in the notification area (Windows), system tray (Linux) or the menu bar at the top-right (macOS). | Read `isTrayIconEnabled` from the settings. |
| 2 | Close the main window with the window close button. On macOS, click the red button. | None | The main window disappears. The app keeps running. The tray icon stays. | Close the window and check the process. |
| 3 | Quit the app from the tray. Right-click the tray icon (macOS: click the icon in the menu bar). Click the last item "Quit". | None | The app process ends. The tray icon disappears. | Click "Quit" and check that the process ended. |
| 4 | Launch the app again the normal way: from the Start menu, the Applications folder or the application launcher. Do not add any option. | No command-line option | The main window shows and has focus. It does not start as tray only. | Launch the app and read the window visibility. |
| 5 | Close the window as in step 2. Quit from the tray as in step 3. Start the app from a terminal with the option `--start-hidden`. macOS: `open -a Rocket.Chat --args --start-hidden`. Windows: run the installed `Rocket.Chat.exe --start-hidden`. Linux: run the installed launcher with `--start-hidden`. | `--start-hidden`, tray icon on | No main window shows. The tray icon shows. | Launch with the option and read the window visibility. |
| 6 | Click the tray icon to show the window. Right-click the icon (macOS: click the icon in the menu bar). Click "Show" in the menu. | None | The main window shows. | Click the item and read the visibility. |
| 7 | Turn the tray icon off in the settings window (step 1, "General", toggle off). Quit with the "File" menu "Quit Rocket.Chat" (macOS: `Cmd+Q`). Start the app with `--start-hidden`. | Tray icon off, `--start-hidden` | The main window shows, The app has no tray icon, so the window must show. | Launch and read the visibility. |
| 8 | Click the "Help" menu. Click "Open Log Viewer". In the search field "Search logs..." type `Root window state applied`. Click the newest entry. | `Root window state applied` | The entry lists the saved visible state, the saved bounds, the tray setting, `shown` and `isVisible`. For the normal launch in step 4, `shown` is `true`. | Search the log and copy the entry. |
| 9 | In the same search field type `Starting Rocket.Chat Desktop application`. | `Starting Rocket.Chat Desktop application` | The entry lists `version` 4.18.0-alpha.6, `userData` and `startHidden`. The line for step 5 shows `startHidden` as `true`. A line "Root window hidden at startup by --start-hidden" exists for step 5. | Search and copy the entries. |
| 10 | With the app running, start a second copy from the launcher. | Second launch | No second window process stays. The first window comes to the front. | Launch again and count the processes. |

## Evidence

- Screenshot after step 4 and after step 5.
- The log entries from steps 8 and 9.
- The package type and OS.

## Failure Signals

- Step 4 shows only the tray icon.
- Step 5 shows the window although the tray icon is on.
- Step 7 leaves the user with no window and no tray icon.
- The log has no "Root window state applied" line.
