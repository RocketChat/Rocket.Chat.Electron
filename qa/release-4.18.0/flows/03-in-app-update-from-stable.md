---
id: REL418-QA-003
title: The in-app updater moves 4.17.4 to the build under test
platforms: [macos, windows, linux]
packages: [dmg, exe, appimage]
priority: smoke
qase:
  suite: Release 4.18.0 / Install and upgrade
  priority: high
  severity: critical
  status: actual
  automation: manual
  qase_id: null
requires: [last_stable_4_17_4_package, published_prerelease]
test_links: []
expected_result: 4.17.4 on the Alpha channel finds the build under test, downloads it, restarts into it, and keeps the workspaces and settings.
---

# The In-App Updater Moves 4.17.4 To The Build Under Test

## Review Basis

- Comparison range: 4.17.4..origin/dev at acaf3a712.
- Changed surface: the update feed and the packages it points to. #3513
  and #3532 changed how `build-release.yml` builds and uploads
  `latest.yml`, `latest-mac.yml`, and `latest-linux.yml`. Only the dmg,
  exe (NSIS), and AppImage packages update themselves.
- User-visible risk: users on 4.17.4 never get 4.18.0, or the download
  fails, or the update leaves a broken install. The stable release uses
  the same feed files.
- Hypothesis: on the Alpha channel, 4.17.4 finds the build under test,
  installs it, and starts it with the user data kept.
- Smallest useful proof: a real update from the published prerelease. The
  release workflow checks the feed file names and file counts, but no test
  downloads through the feed.
- Note: the old 4.17.4 code runs the update steps. On macOS, "Restart to
  update" in 4.17.4 can leave the app open. #3543 fixes that in 4.18.0, and
  REL418-QA-054 tests the fix. In this flow, quit the app by hand if it
  stays open.

## Steps

| Step | Action | Test data | Expected result | Agent action |
| --- | --- | --- | --- | --- |
| 1 | Install Rocket.Chat 4.17.4 with this package type, add one workspace, and sign in. On the add-workspace screen, type the URL in the field labeled "Enter your server URL" and click Connect. | `gh release download 4.17.4 -p '<pattern>' -D <new empty folder>`. Patterns: `*-mac.dmg`, `*-win.exe`, `*.AppImage`. | The workspace opens signed in. | Take a screenshot. |
| 2 | Turn on Developer Mode. Click the Help menu in the menu bar (macOS) or at the top of the window (Windows, Linux). Click Developer Mode. | None. | Developer Mode shows a check mark the next time you open the Help menu. | Take a screenshot of the Help menu. |
| 3 | Press Command+, (macOS) or Ctrl+, (Windows, Linux). In the left sidebar of the App settings window, click Advanced. Find the field labeled "Update channel" at the top of the section. Select "Alpha (Experimental)". | Channel: Alpha (Experimental). | The field shows "Alpha (Experimental)". | Take a screenshot of the field. |
| 4 | In the left sidebar, click General. Click the button labeled "Check for updates now". | None. | The text "Version 4.18.0-alpha.N is available" shows near the button, where N is the build under test. A label "Update" shows at the right end of the top bar of the main window. | Take a screenshot of the message and the label. |
| 5 | In the main window, click the "Update" label at the right end of the top bar. | None. | A dialog "New version is available" opens. It shows "Current version" 4.17.4 and "New version" equal to the build under test, with the buttons "Install update" and "Skip this version". | Take a screenshot of the dialog. |
| 6 | Click "Install update". Wait for the download. | None. | The top bar label shows "Updating…" with a percentage, then "Restart to update". | Take a screenshot of each label state. |
| 7 | Click "Restart to update". If the app is still open after 30 seconds, quit it from the menu. On macOS, click Rocket.Chat > Quit Rocket.Chat. On Windows and Linux, click File > Quit Rocket.Chat. Then start the app again. | None. | The app starts again. The workspace from step 1 opens signed in. | Record whether the app quit by itself, and on which OS. |
| 8 | Press Command+, (macOS) or Ctrl+, (Windows, Linux). Look at the bottom of the left sidebar. Then click Advanced. | None. | The sidebar shows the build under test. "Update channel" still shows "Alpha (Experimental)". | Take a screenshot of the version and the channel. |

## Evidence

- Screenshots of the update message, the dialog, and the label states.
- The version after the update.
- The main log of the updated app. macOS:
  `~/Library/Logs/Rocket.Chat/main.log`. Use Help > Open Log Viewer on all
  platforms.

## Failure Signals

- "Check for updates now" shows "No updates are available." or "An error
  has occurred when looking for updates".
- The download stops, or the label never shows "Restart to update".
- The app does not start after the update, or the version did not change.
- The workspace shows the sign-in page after the update.
