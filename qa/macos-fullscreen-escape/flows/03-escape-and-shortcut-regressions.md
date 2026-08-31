---
id: FSESC-QA-003
title: Escape, menu shortcuts and fullscreen toggles still work on macOS
platforms: [macos]
priority: release
qase:
  suite: Window and fullscreen
  priority: high
  severity: major
  status: actual
  automation: manual
  qase_id: null
requires: [installed_branch_build, workspace_logged_in]
test_links: []
expected_result: Escape still dismisses workspace UI, menu keyboard shortcuts still fire from the workspace, and both fullscreen toggles still enter and leave fullscreen.
---

# Escape And Shortcut Regressions On macOS

## Review Basis

- Comparison range: `master` (`7aa3dae6d`) to `fix/macos-escape-exits-fullscreen`
  (`3bdd1e747`).
- Changed surface: `before-input-event` interception on the server webview and the
  root window contents. The fix cancels the original Escape key event and replays
  a synthetic one, and it stops forwarding the Escape key up to the desktop
  window.
- User-visible risk: The interception could swallow Escape entirely, so workspace
  search and modals would stop closing; it could break macOS menu keyboard
  shortcuts typed while the workspace has focus; or it could leave the window
  unable to enter or leave fullscreen through the normal controls.
- Hypothesis: After the fix, Escape still reaches the workspace web app, menu
  shortcuts still fire while the workspace has focus, and both `Control+Command+F`
  and the `View` -> `Full screen` menu item still toggle fullscreen in both
  directions.
- Smallest useful proof: Local UI repro on macOS. Automated coverage exists for the
  key forwarding contract in `src/ui/main/serverView/index.spec.ts` and
  `src/ui/main/rootWindow.spec.ts`, but keyboard delivery to the web app and to the
  macOS menu bar can only be observed at runtime.

## Steps

| Step | Action | Test data | Expected result | Agent action |
| --- | --- | --- | --- | --- |
| 1 | Launch the Rocket.Chat Desktop build under test on macOS in a normal, non-fullscreen window, and wait for a workspace channel list to appear on the left. | Build from branch `fix/macos-escape-exits-fullscreen` or the release candidate containing it. | The workspace is loaded and the window is windowed, with the three colored dots visible at the top-left. | Launch the build and confirm the window is not fullscreen. |
| 2 | Click the magnifier search icon in the top row of the workspace channel list on the left, type three or four letters of a channel name, then press `Escape` once. | Search text: any short string such as `gen`. | The search field and its result list close and the normal channel list returns, proving Escape still reaches the workspace web app while windowed. | Open workspace search, type, send Escape, and confirm the search UI closed. |
| 3 | Click the green circular button at the top-left corner of the window, the third of the three colored dots, to enter macOS native fullscreen, then repeat the search and `Escape` sequence from step 2. | Search text: any short string such as `gen`. | The search UI closes on Escape and the window is still fullscreen. Escape is delivered to the workspace and does not leave fullscreen. | Enter fullscreen, repeat the search and Escape check, and re-check the window bounds. |
| 4 | With the window still fullscreen and focus in the workspace message list, press `Command+R`. | Shortcut: `Command+R`, matching the macOS menu bar item `View` -> `Reload`. | The workspace view reloads, showing a loading state and then the channel list again. Menu keyboard shortcuts still reach the macOS menu from the workspace. | Send the shortcut and confirm the workspace reloaded. |
| 5 | With the window still fullscreen, press `Control+Command+F`. | Shortcut: `Control+Command+F`, matching the macOS menu bar item `View` -> `Full screen`. | The window leaves fullscreen and returns to a normal window, with the three colored dots visible again at the top-left. | Send the shortcut and confirm the window is no longer fullscreen. |
| 6 | Press `Control+Command+F` again, then move the pointer to the very top of the screen so the macOS menu bar appears, click `View`, and check the `Full screen` item. | Menu path: macOS menu bar -> `View` -> `Full screen`. | The window is fullscreen again and the `Full screen` item shows a checkmark. Click the item to leave fullscreen and confirm the window returns to a normal window. | Toggle fullscreen through both the shortcut and the menu item and confirm each direction works. |
| 7 | With the window in a normal, non-fullscreen state, post or open a short video in the message list, play it, then click the fullscreen button at the right end of the video control bar, the icon drawn as four outward-pointing corner brackets. Press `Escape` once. | Any small `.mp4` file, for example a 5 to 10 second clip. | The video fills the screen while fullscreen, and after Escape both the video and the window return to the previous normal window size. The windowed case must not regress. | Run the windowed video fullscreen cycle and confirm the window returned to its previous bounds. |
| 8 | Record the result using the format in `qa/macos-fullscreen-escape/README.md`. | Include macOS version, build, and which of the checks passed. | The result names each regression check separately. | Write a concise result note without committing machine-specific logs unless requested. |

## Evidence

- Note or screenshot for each check: search closes on Escape while windowed and
  while fullscreen, `Command+R` reloads, `Control+Command+F` toggles both ways,
  the `View` -> `Full screen` item toggles both ways, and the windowed video
  fullscreen cycle returns to the previous window size.
- macOS version and build identifier.

## Failure Signals

- Escape no longer closes workspace search or workspace modals.
- `Command+R` or other menu shortcuts stop working while the workspace has focus.
- `Control+Command+F` or the `View` -> `Full screen` item no longer enters or
  leaves fullscreen.
- The `Full screen` checkmark disagrees with the actual window state.
- After a windowed video fullscreen cycle the window does not return to its
  previous size, or stays fullscreen.
