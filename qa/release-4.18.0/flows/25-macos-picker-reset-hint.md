---
id: REL418-QA-025
title: macOS picker shows the reset hint when the grant does not apply
platforms: [macos]
packages: [dmg, pkg, mas]
priority: high
qase:
  suite: Release 4.18.0 / Video calls
  priority: medium
  severity: normal
  status: actual
  automation: manual
  qase_id: null
requires: [installed_prerelease_build, macos_screen_recording_not_granted]
test_links: []
expected_result: The macOS picker shows the extra line about the minus button. Windows and Linux do not.
---

# macOS Picker Shows The Reset Hint When The Grant Does Not Apply

## Review Basis

- Comparison range: `4.17.4..origin/dev` at `acaf3a712`.
- Changed surface: #3552 (`screenSharing.permissionAlreadyOnHint` in `src/screenSharing/screenSharePicker.tsx`, shown only when `process.platform === 'darwin'`. The string is in 16 locales).
- User-visible risk: A user moves between the Developer ID build and the App Store or TestFlight build. Both use bundle id `chat.rocket`. System Settings shows Rocket.Chat as allowed, but macOS does not apply the grant to the other signature. Screen sharing fails and the picker tells the user to turn on a switch that is already on.
- Hypothesis: When the grant does not apply, the picker shows the red box `Screen Recording Permission Denied` with the extra line that starts with `Already turned on?`. Following that line makes sharing work.
- Smallest useful proof: The Mac App Store build has no in-app call window (`isInternalVideoChatWindowEnabled` is `!process.mas`), and the web client calls `getDisplayMedia` only from a call. A tester reaches the picker on `mas` only through the workspace DevTools console, which the `View` menu does not gate on `process.mas`. The workspace handler in `src/screenSharing/serverViewScreenSharing.ts` then opens the picker in the main window. Manual run with two packages that have different signatures on one Mac. Install a Developer ID build (`dmg` or `pkg`) and grant the permission. Then install the TestFlight build (`mas`). The hint text is not in the source of the Windows picker branch. Windows and Linux are open: the platform guard is the proof for them.

## Steps

| Step | Action | Test data | Expected result | Agent action |
| --- | --- | --- | --- | --- |
| 1 | Install the `dmg` build, start it, open a call, and share the screen once. Allow access when macOS asks. Quit the app. | `dmg` build, signed-in workspace | Sharing works. System Settings, `Screen & System Audio Recording` lists `Rocket.Chat` as on. | Install, share, and capture the list. |
| 2 | Install the `mas` build (TestFlight) over the `dmg` build. Start it. The Mac App Store build has no in-app call window, so open the workspace DevTools: `View`, `Open DevTools` (`Cmd+Option+I`). Click the `Console` tab. | `mas` build | The DevTools window shows the `Console` tab. | Install, start, and open DevTools. |
| 3 | On `mas`, type `navigator.mediaDevices.getDisplayMedia({video: true})` in the console and press Enter. The workspace window then shows the picker. | | The picker opens with the title `Share your screen`. A red box with the title `Screen Recording Permission Denied` fills the body. It says `Screen recording permission is required to share your screen.` and has the link `Open System Preferences`. | Run the command and capture the picker. |
| 4 | Read the last line of the red box. | | The last line reads `Already turned on? Select Rocket.Chat in that list, remove it with the minus (−) button, and quit and reopen Rocket.Chat. Then share your screen again and allow access when macOS asks.` | Capture the box and compare the text. |
| 5 | Click `Open System Preferences`. In the list, select `Rocket.Chat` and click the minus (−) button below the list. Quit Rocket.Chat and start it again. | | System Settings opens on the Screen Recording list. The entry is gone. | Follow the text and capture the list. |
| 6 | Run the same `getDisplayMedia` command in the DevTools console again, as in step 3. Click `Allow` in the macOS dialog. | | The picker lists screens and sharing works. | Share and capture the picker. |
| 7 | For a quick platform check, open the picker on Windows or Linux with screen access denied, if you can. | Windows or Linux build | The hint line does not appear. On Linux and Windows the red box can be absent when no permission is required. | Capture the picker if it shows. |

## Evidence

- Screenshot of the red box at step 3 and step 4.
- Screenshot of the System Settings list before and after step 5.

## Failure Signals

- The hint line is missing from the red box at step 4.
- The hint shows on Windows or Linux.
- Sharing still fails after step 6.
