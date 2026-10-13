---
id: REL418-QA-024
title: macOS asks for Screen Recording only when the user shares
platforms: [macos]
packages: [dmg, pkg, mas]
priority: release
qase:
  suite: Release 4.18.0 / Video calls
  priority: high
  severity: major
  status: actual
  automation: manual
  qase_id: null
requires: [installed_prerelease_build, macos_screen_recording_not_granted]
test_links: []
expected_result: Launch shows no Screen Recording prompt. The first share request shows it.
---

# macOS Asks For Screen Recording Only When The User Shares

## Review Basis

- Comparison range: `4.17.4..origin/dev` at `acaf3a712`.
- Changed surface: #3552 (`prewarmDesktopCapturerCacheIfPermitted` in `src/screenSharing/desktopCapturerCache.ts`). `setupServerViewDisplayMedia` and the video call window `prewarm-capturer-cache` handler use it. The gate is `systemPreferences.getMediaAccessStatus('screen') === 'granted'`.
- User-visible risk: macOS shows the Screen Recording prompt at every launch before the user shares. The log shows `Background cache refresh failed for screens: Failed to get sources.`
- Hypothesis: With the permission not granted, a launch and a call window open show no macOS prompt and no `Failed to get sources` line. The first share request shows the prompt. A user who already granted the permission sees no change.
- Smallest useful proof: Manual run on each macOS package. The startup check applies to `mas` too, because the workspace view warms the cache at setup. The call window steps apply to `dmg` and `pkg` only, because the Mac App Store build has no in-app call window (`isInternalVideoChatWindowEnabled` is `!process.mas`). The author did not run the startup gate on a packaged build. The Mac App Store build (TestFlight) and the Developer ID build (`dmg`, `pkg`) have different signatures and keep separate permission records. Screen capture cannot be tested in a software-rendered VM.

## Steps

| Step | Action | Test data | Expected result | Agent action |
| --- | --- | --- | --- | --- |
| 1 | Quit Rocket.Chat. Open Terminal and run the command in the test data. The command clears the Screen Recording record of the app. | `tccutil reset ScreenCapture chat.rocket` | The command prints `Successfully reset ScreenCapture approval status for chat.rocket`. | Run the command and copy the output. |
| 2 | In Terminal, run the command in the test data to note the log size before launch. | `wc -l ~/Library/Logs/Rocket.Chat/main.log` (`dmg`, `pkg`) or `wc -l ~/Library/Containers/chat.rocket/Data/Library/Logs/Rocket.Chat/main.log` (`mas`) | A line count shows. Note it. | Run the command and store the number. |
| 3 | Open Rocket.Chat from the Applications folder. The app must have at least one signed-in workspace. Wait 30 seconds. | | The app opens on the workspace. No macOS dialog about Screen Recording appears. | Launch and capture the whole screen. |
| 4 | Run this step on `dmg` and `pkg` only. The Mac App Store build has no in-app call window, and calls open in the browser. On `mas`, go to step 5. Click a conference link in a room so that the call window opens. Wait 10 seconds. | `https://<workspace-host>/conference/<alias>` | The call window opens. No macOS dialog about Screen Recording appears. | Click the link and capture the screen. |
| 5 | In Terminal, run the log check in the test data. | `tail -n +<count from step 2> <log path>` | The output has no line with `Failed to get sources`. | Run the command and search the output. |
| 6 | On `dmg` and `pkg`, click the screen share control of the meeting toolbar in the call window. On `mas`, there is no call window, so open the workspace DevTools (`View`, `Open DevTools`, or `Cmd+Option+I`). Click the `Console` tab, type `navigator.mediaDevices.getDisplayMedia({video: true})`, and press Enter. | | A macOS dialog asks to allow Rocket.Chat to record the screen. Or the picker shows the red box `Screen Recording Permission Denied`. | Click the control or run the command. Capture the screen. |
| 7 | Allow the access in the macOS dialog, or open System Settings, `Privacy & Security`, `Screen & System Audio Recording`, and switch on `Rocket.Chat`. Quit and reopen Rocket.Chat. Share again. | | The picker lists screens. On the next launch, no macOS dialog appears. | Grant the access, relaunch, and capture. |

## Evidence

- Screenshot of the screen at step 3 and step 4 (no dialog. Step 4 is on `dmg` and `pkg` only).
- Output of step 5.
- Screenshot of the dialog at step 6.

## Failure Signals

- A macOS Screen Recording dialog shows at step 3 or step 4. On `mas`, only step 3 applies.
- The log has a `Failed to get sources` line from the new launch.
- A user who already granted the permission cannot open the picker with sources.
