---
id: FSESC-QA-001
title: Escape leaves only the video fullscreen while the app window stays fullscreen
platforms: [macos]
priority: smoke
qase:
  suite: Window and fullscreen
  priority: high
  severity: major
  status: actual
  automation: manual
  qase_id: null
requires: [installed_branch_build, workspace_logged_in]
test_links: []
expected_result: Pressing Escape while a video plays in HTML5 fullscreen returns the video to its inline size and the app window remains in macOS native fullscreen.
---

# Escape Leaves Only The Video Fullscreen

## Review Basis

- Comparison range: `master` (`7aa3dae6d`) to `fix/macos-escape-exits-fullscreen`
  (`3bdd1e747`).
- Changed surface: Electron main process keyboard handling for server webviews
  and the root window (`src/ui/main/escapeFullscreenGuard.ts`,
  `src/ui/main/serverView/index.ts`, `src/ui/main/rootWindow.ts`).
- User-visible risk: A customer watching a video in a fullscreen app window
  presses Escape to leave the video and the whole app drops out of macOS
  fullscreen, losing their window arrangement and Space.
- Hypothesis: With the app window in macOS native fullscreen and a video in HTML5
  fullscreen, one Escape press returns the video to its inline size and the app
  window is still fullscreen, matching Google Chrome.
- Smallest useful proof: OS-level repro on macOS hardware. The Jest suite covers
  the desktop wiring only
  (`src/ui/main/escapeFullscreenGuard.main.spec.ts`,
  `src/ui/main/serverView/index.spec.ts`), because a test generated key event is
  synthetic and never reaches macOS AppKit, which is what caused the original
  regression.

## Steps

| Step | Action | Test data | Expected result | Agent action |
| --- | --- | --- | --- | --- |
| 1 | Launch the Rocket.Chat Desktop build under test on macOS and wait until a workspace channel list is visible on the left and message content fills the rest of the window. | Build from branch `fix/macos-escape-exits-fullscreen` or the release candidate containing it; any workspace where you can post a file. | The workspace is loaded and messages are readable. | Launch the build and confirm the workspace view rendered. |
| 2 | Put the window into macOS native fullscreen: click the green circular button at the top-left corner of the window, the third of the three colored dots. | No input data. | The window fills the whole screen, the macOS menu bar hides until you move the pointer to the top edge, and the row of colored dots disappears. | Enter fullscreen through the window control and confirm the window covers the screen. |
| 3 | Confirm the app itself knows it is fullscreen: move the pointer to the very top of the screen so the macOS menu bar appears, click `View` in that menu bar, and look at the `Full screen` item. | Menu path: macOS menu bar -> `View` -> `Full screen` (keyboard equivalent `Control+Command+F`). | The `Full screen` item shows a checkmark. Close the menu with a click elsewhere. | Read the menu state or the app's fullscreen state and confirm it reports fullscreen. |
| 4 | In the message box at the bottom of the channel, attach and send a short video file, then click the play button in the middle of the video player that appears in the message list. | Any small `.mp4` file, for example a 5 to 10 second clip. | The video plays inline inside the message, with a control bar along the bottom edge of the player. | Post the video and start playback. |
| 5 | Hover the playing video to reveal its control bar, then click the fullscreen button at the right end of that bar, the icon drawn as four outward-pointing corner brackets. | No input data. | The video expands to cover the entire screen; the channel list and message list are no longer visible. | Enter the video's HTML5 fullscreen and confirm only the video is visible. |
| 6 | Press the `Escape` key once. | Key: `Escape`. | The video returns to its inline size inside the message list, and the app window is still in macOS fullscreen: it still covers the whole screen, the colored window dots are still hidden, and the macOS menu bar still auto-hides. This is the pass condition of the flow. | Send one Escape key press and then compare the window bounds against the screen bounds. |
| 7 | Move the pointer to the top of the screen, click `View` in the macOS menu bar and confirm `Full screen` still shows a checkmark. | Menu path: macOS menu bar -> `View` -> `Full screen`. | The checkmark is still present, confirming the window never left fullscreen. | Re-read the fullscreen state and confirm it is unchanged. |
| 8 | Repeat steps 5 to 7 with an embedded player instead of an attachment: send a message containing a YouTube video link, wait for the preview player to render under the message, click its play button, then click the fullscreen button at the right end of the player's own control bar. | Any public YouTube URL, for example a short clip link pasted as plain text. | Escape returns the embedded player to its inline preview size and the app window is still in macOS fullscreen. This covers a video inside a cross-origin frame. | Repeat the fullscreen and Escape sequence on the embedded player and re-check the window bounds. |
| 9 | Record the result using the format in `qa/macos-fullscreen-escape/README.md`. | Include macOS version, build, and whether both the attachment and the embedded player were covered. | The result states clearly which video sources were exercised. | Write a concise result note without committing machine-specific logs unless requested. |

## Evidence

- Screenshot taken right after the Escape press showing the inline video and a
  window that still covers the whole screen.
- Note of the `View` -> `Full screen` checkmark state before and after Escape.
- macOS version and build identifier.

## Failure Signals

- The app window leaves macOS fullscreen when Escape is pressed.
- The video stays in fullscreen after Escape, or needs a second Escape press.
- The `View` -> `Full screen` checkmark clears after Escape.
- The window leaves fullscreen for the embedded player but not for the attachment,
  or the reverse.
- The window visibly starts leaving fullscreen and then animates back in.
