---
id: FSESC-QA-002
title: Escape with nothing to dismiss keeps the app window in macOS fullscreen
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
expected_result: Pressing Escape in the workspace or in the desktop app chrome while the window is in macOS native fullscreen never takes the window out of fullscreen.
---

# Plain Escape Keeps The Window Fullscreen

## Review Basis

- Comparison range: `master` (`7aa3dae6d`) to `fix/macos-escape-exits-fullscreen`
  (`3bdd1e747`).
- Changed surface: Escape handling for both the server webview
  (`src/ui/main/serverView/index.ts`) and the desktop app chrome
  (`src/ui/main/rootWindow.ts`), sharing
  `src/ui/main/escapeFullscreenGuard.ts`.
- User-visible risk: A customer in fullscreen presses Escape out of habit, with no
  modal or search open, and the app leaves fullscreen. This is the general form of
  the bug; the video case is only its most visible symptom.
- Hypothesis: With the app window in macOS native fullscreen, an Escape press that
  has nothing to dismiss leaves the window fullscreen, both when focus is in the
  workspace content and when focus is in the desktop App settings screen.
- Smallest useful proof: OS-level repro on macOS hardware. The desktop wiring is
  covered by `src/ui/main/rootWindow.spec.ts`
  (`rootWindow Escape fullscreen guard`) and
  `src/ui/main/escapeFullscreenGuard.main.spec.ts`, but a synthetic key event
  cannot reproduce the macOS AppKit behavior under test.

## Steps

| Step | Action | Test data | Expected result | Agent action |
| --- | --- | --- | --- | --- |
| 1 | Launch the Rocket.Chat Desktop build under test on macOS, then click the green circular button at the top-left corner of the window, the third of the three colored dots, to enter macOS native fullscreen. | Build from branch `fix/macos-escape-exits-fullscreen` or the release candidate containing it. | The window fills the whole screen and the three colored dots are hidden. | Launch the build and enter fullscreen. |
| 2 | Click once on an empty area of the message list, for example the blank space to the right of a message timestamp, so keyboard focus is in the workspace content and no search field, modal, or side panel is open. | No input data. | No dialog, dropdown, search field, or contextual panel is visible on screen. | Focus the workspace content and confirm no dismissable UI is open. |
| 3 | Press the `Escape` key once. | Key: `Escape`. | Nothing happens visually and the window is still fullscreen: it still covers the whole screen, the colored window dots stay hidden, and the macOS menu bar still auto-hides. | Send one Escape press and compare window bounds against screen bounds. |
| 4 | Press the `Escape` key five more times, once per second. | Key: `Escape`, six presses total including step 3. | The window is still fullscreen after every press. Repeated presses matter because the fix has to re-arm between presses. | Send repeated Escape presses with a short delay and re-check the window bounds after each. |
| 5 | Press and hold the `Escape` key for about three seconds so macOS generates key repeats, then release it. | Key: `Escape` held down. | The window is still fullscreen. | Send an auto-repeating Escape and re-check the window bounds. |
| 6 | Move focus to the desktop app chrome instead of the workspace: move the pointer to the very top of the screen so the macOS menu bar appears, click `Window` in that menu bar, then click `App settings`. | Menu path: macOS menu bar -> `Window` -> `App settings`, keyboard equivalent `Command+,`. | The desktop App settings screen replaces the workspace content, showing tabs such as `General` near the top. | Navigate to the desktop App settings screen. |
| 7 | Click once on an empty area of the App settings screen, away from any input field, then press the `Escape` key once. | Key: `Escape`. | The window is still fullscreen and the App settings screen is still shown. | Send one Escape press with the App settings screen focused and re-check the window bounds. |
| 8 | Record the result using the format in `qa/macos-fullscreen-escape/README.md`. | Include macOS version, build, and whether both the workspace and the App settings screen were covered. | The result states which focus locations were exercised. | Write a concise result note without committing machine-specific logs unless requested. |

## Evidence

- Screenshot after the repeated Escape presses showing a window that still covers
  the whole screen.
- Note of how many Escape presses and whether the held-key repeat case was run.
- macOS version and build identifier.

## Failure Signals

- The window leaves macOS fullscreen on any Escape press.
- The first Escape press is safe but a later press, or a held key, leaves
  fullscreen. That points at the guard failing to re-arm.
- Escape leaves fullscreen only when focus is in the desktop App settings screen,
  or only when focus is in the workspace content.
