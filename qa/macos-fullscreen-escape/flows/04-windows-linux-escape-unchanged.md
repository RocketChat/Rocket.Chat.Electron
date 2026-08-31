---
id: FSESC-QA-004
title: Escape and video fullscreen behave exactly as before on Windows and Linux
platforms: [windows, linux]
priority: release
qase:
  suite: Window and fullscreen
  priority: medium
  severity: normal
  status: actual
  automation: manual
  qase_id: null
requires: [installed_branch_build, workspace_logged_in]
test_links: []
expected_result: On Windows and Linux, Escape and video fullscreen behave the same as before the macOS fix, with no swallowed keys and no changed window state.
---

# Windows And Linux Escape Unchanged

## Review Basis

- Comparison range: `master` (`7aa3dae6d`) to `fix/macos-escape-exits-fullscreen`
  (`3bdd1e747`).
- Changed surface: `before-input-event` handling shared by all platforms in
  `src/ui/main/serverView/index.ts` and `src/ui/main/rootWindow.ts`. Every new code
  path is behind `process.platform === 'darwin'`, but the Escape key up is no
  longer forwarded to the desktop window on any platform.
- User-visible risk: A macOS-only fix silently changing Windows or Linux behavior,
  either by swallowing Escape, by leaving a video stuck in fullscreen, or by
  changing how the window responds to fullscreen keys.
- Hypothesis: On Windows and Linux, Escape still reaches the workspace web app,
  video fullscreen still exits on Escape, and the window fullscreen state is not
  affected by Escape at all.
- Smallest useful proof: Local UI repro per platform. The platform guards are
  covered by `src/ui/main/escapeFullscreenGuard.main.spec.ts` and the
  `other platforms` cases in `src/ui/main/serverView/index.spec.ts`, but the
  desktop build should still be smoke-checked on each platform.

## Steps

| Step | Action | Test data | Expected result | Agent action |
| --- | --- | --- | --- | --- |
| 1 | Launch the Rocket.Chat Desktop build under test on Windows or Linux and wait for a workspace channel list to appear on the left. | Build from branch `fix/macos-escape-exits-fullscreen` or the release candidate containing it. Record which OS this run covers. | The workspace is loaded. | Launch the build and confirm the workspace view rendered. |
| 2 | Click the magnifier search icon in the top row of the workspace channel list on the left, type three or four letters of a channel name, then press `Escape` once. | Search text: any short string such as `gen`. | The search field and its result list close and the normal channel list returns, proving Escape still reaches the workspace web app. | Open workspace search, type, send Escape, and confirm the search UI closed. |
| 3 | Post or open a short video in the message list, click its play button, then click the fullscreen button at the right end of the video control bar, the icon drawn as four outward-pointing corner brackets. | Any small `.mp4` file, for example a 5 to 10 second clip. | The video fills the whole screen. | Enter the video's fullscreen and confirm only the video is visible. |
| 4 | Press `Escape` once. | Key: `Escape`. | The video returns to its inline size inside the message list and the window returns to the size it had before the video went fullscreen. | Send one Escape press and compare the window bounds with the pre-fullscreen bounds. |
| 5 | Put the window into fullscreen using the platform control: on Windows press `F11` if the build exposes it, otherwise maximize the window; on Linux use the window manager fullscreen action for the window. Then click an empty area of the message list and press `Escape` once. | Note which control was used to reach fullscreen or maximized state. | The window state is unchanged by the Escape press; Escape neither leaves fullscreen nor restores the window. | Reach the platform fullscreen or maximized state, send Escape, and confirm the window state did not change. |
| 6 | Record the result using the format in `qa/macos-fullscreen-escape/README.md`, naming the platform covered. | Include OS and version, build, and which checks passed. | The result names the platform explicitly, because this flow must be run once per platform. | Write a concise result note without committing machine-specific logs unless requested. |

## Evidence

- Note or screenshot showing workspace search closing on Escape.
- Note of the window bounds before and after the video fullscreen cycle.
- OS name and version plus build identifier.

## Failure Signals

- Escape stops closing workspace search or workspace modals.
- The video stays in fullscreen after Escape, or needs a second press.
- The window does not return to its pre-fullscreen size after the video exits
  fullscreen.
- The window state changes on an Escape press.
