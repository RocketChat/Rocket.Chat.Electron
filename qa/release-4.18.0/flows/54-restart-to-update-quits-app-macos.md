---
id: REL418-QA-054
title: Restart To Update Quits And Relaunches The App On macOS
platforms: [macos]
packages: [dmg]
priority: release
qase:
  suite: Release 4.18.0 / App shell
  priority: high
  severity: major
  status: actual
  automation: manual
  qase_id: null
requires: [earlier_prerelease_with_fix_4_18_0_alpha_5]
test_links: []
expected_result: Click "Restart to update" in the title bar. The app quits, installs the downloaded update and starts again with the new version.
---

# Restart To Update Quits And Relaunches The App On macOS

## Review Basis

- Comparison range: 4.17.4..origin/dev at acaf3a712. Build under test: 4.18.0-alpha.6.
- Changed surface: #3543 (`src/ui/main/rootWindow.ts`: the root window removes its close guard on the Electron `autoUpdater` event `before-quit-for-update`). The button is `UpdateLabel` in the title bar, text `tabBar.update.restart`. This applies to self-updating packages. On macOS that is the `dmg`. The `pkg` and `mas` builds do not self-update. Windows and Linux call `app.quit()` and are not affected.
- User-visible risk: The user clicks "Restart to update". The main window hides, the app keeps running, and the update is not installed.
- Hypothesis: With a downloaded update, the click quits the app and the new version starts. The PR author could not test a real install, because it needs a signed packaged build with a staged update. This flow is that test.
- Smallest useful proof: Two specs in `rootWindow.spec.ts` and a dev-app check with a stand-in update event. A real update needs two published builds. The restart runs in the version that updates, so start from 4.18.0-alpha.5, which has the fix, and update to the build under test.
- Known limitation in #3543: After an update restart on macOS, the settings, downloads and log viewer windows do not open again. This is not a failure of this flow.

## Steps

| Step | Action | Test data | Expected result | Agent action |
| --- | --- | --- | --- | --- |
| 1 | Install the `dmg` of 4.18.0-alpha.5. That build already has the fix (#3543 is in 4.18.0-alpha.3 and later), so the restart runs the fixed code. Start the app. Add one workspace and sign in. | `gh release download 4.18.0-alpha.5 -p '*-mac.dmg' -D <new empty folder>` | The app shows its main window with the workspace. | Install and start the app. |
| 2 | Click the "Help" menu, then "Developer Mode", to turn it on. Open the settings window with `Cmd+,`. Click "Advanced" in the left list. Find "Update channel". Select the channel that holds the target build. | Channel with the target build | Developer Mode shows a check mark. "Update channel" shows the selected channel. | Toggle the menu item and set the channel. |
| 3 | In the settings window, click "General" in the left list. Click the button labeled "Check for updates now". Then look at the top bar of the main window, at the right of the workspace tabs. | None | The text "Version X is available" shows near the button, where X is the build under test. A pill with the text "Update" shows in the top bar. | Click the button and read the message and the pill. |
| 4 | Click the "Update" pill. A dialog opens. Click "Install update". | None | The pill changes to "Updating… N%" and fills from the left. | Click the pill and the button. Read the pill text. |
| 5 | Wait until the download ends. | None | The pill shows the text "Restart to update". | Poll the pill text. |
| 6 | Click the "Restart to update" pill. Watch the Dock. | None | The main window closes. The Rocket.Chat icon leaves the Dock. The app process ends. It does not stay as a hidden app. | Click the pill. Check that the process ended in 30 seconds. |
| 7 | Wait up to 60 seconds. | None | The app starts again by itself and shows the main window. | Wait and read the process list. |
| 8 | Click the "Rocket.Chat" menu at the top-left of the menu bar. Click "About Rocket.Chat". | None | The version is the target version. The workspace and the sign-in are still there. | Read the About dialog and the workspace list. |
| 9 | Run `pgrep -fl Rocket.Chat` in a terminal. | None | Only one set of processes of the new version runs. No old-version process stays. | Run the command and read the output. |

## Evidence

- Screenshots of the pill in the states from steps 3, 4 and 5.
- The About dialog from step 8.
- The version of the older build and the target build.
- The main log: `~/Library/Logs/Rocket.Chat/main.log`, the lines around the update.

## Failure Signals

- After step 6 the main window hides but the app stays in the Dock or in the process list.
- The app quits and does not start again, or the version does not change.
- The pill goes back to "Update" after the click.
- The workspace or the sign-in is lost after the update.
