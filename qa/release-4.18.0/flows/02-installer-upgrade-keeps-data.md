---
id: REL418-QA-002
title: Installing over 4.17.4 keeps workspaces, sign-in, and settings
platforms: [macos, windows, linux]
packages: [dmg, pkg, mas, exe, msi, appimage, deb, rpm]
priority: smoke
qase:
  suite: Release 4.18.0 / Install and upgrade
  priority: high
  severity: critical
  status: actual
  automation: manual
  qase_id: null
requires: [installed_prerelease_build, last_stable_4_17_4_package]
test_links: []
expected_result: After the build-under-test package installs over 4.17.4, the same workspaces open signed in and the changed settings keep their values.
---

# Installing Over 4.17.4 Keeps Workspaces, Sign-In, And Settings

## Review Basis

- Comparison range: 4.17.4..origin/dev at acaf3a712.
- Changed surface: the stored app state. #3514 removed the old in-shell
  settings and downloads views. #3516 removed core-shell no-ops. #3541 added
  stored state for web UI builds. #3507 changed how the app writes its
  config file. #3488 and #3504 changed the saved window bounds.
- User-visible risk: after the upgrade, the user loses the workspaces,
  must sign in again, or loses settings.
- Hypothesis: a package of the build under test, installed over 4.17.4, reads the
  4.17.4 state with no loss.
- Smallest useful proof: an upgrade on each package type that keeps user
  data. The unit tests do not read a real 4.17.4 config file.

## Steps

| Step | Action | Test data | Expected result | Agent action |
| --- | --- | --- | --- | --- |
| 1 | Install Rocket.Chat 4.17.4 with the same package type as this target. For `mas`, install the App Store version. | `gh release download 4.17.4 -p '<pattern>' -D <new empty folder>`. Use the patterns of REL418-QA-001, step 2. | Rocket.Chat 4.17.4 starts. Press Command+, (macOS) or Ctrl+, (Windows, Linux). The bottom of the left sidebar in App settings shows `4.17.4`. | Take a screenshot of the version. |
| 2 | Add two workspaces. On the add-workspace screen, type the first URL in the field labeled "Enter your server URL" and click Connect. Sign in. Then press Command+N (macOS) or Ctrl+N (Windows, Linux) to add the second workspace, and sign in. | Two workspace URLs and accounts. | The left vertical server list shows two workspace icons. Both workspaces show the signed-in home page. | Record the two URLs. |
| 3 | Change three settings that you can see again later. Press Command+, (macOS) or Ctrl+, (Windows, Linux). In the App settings window, change the theme in the Appearance section. In the General section, change one switch. Then move and resize the main window. | Theme: Dark. Note the switch name and its new value. | The settings keep the new values. | Take a screenshot of each changed section. |
| 4 | Quit Rocket.Chat. On macOS, click the Rocket.Chat menu at the left of the menu bar, then click Quit Rocket.Chat. On Windows and Linux, click the File menu at the top left of the window, then click Quit Rocket.Chat. | None. | No Rocket.Chat process stays. | Check the process list. |
| 5 | Install the build-under-test package of the same type over 4.17.4. Do not remove 4.17.4 first. For `mas`, install the TestFlight build. For AppImage, start the new AppImage file. | The build-under-test package from REL418-QA-001, step 2. | The install completes with no message about existing data. | Record the install output. |
| 6 | Start Rocket.Chat. | None. | The main window opens at the same size and position as in step 3. The left vertical server list shows the same two workspaces, in the same order. | Take a screenshot of the main window. |
| 7 | Click each workspace icon in the left vertical server list. | None. | Each workspace opens signed in. No sign-in page shows. | Take a screenshot of each workspace. |
| 8 | Press Command+, (macOS) or Ctrl+, (Windows, Linux). Look at the bottom of the left sidebar, then open the sections that you changed in step 3. | None. | The sidebar shows the version of the build under test. The theme and the switch keep the values from step 3. | Take a screenshot of the version and the settings. |

## Evidence

- Screenshots of the version before and after the upgrade.
- Screenshots of the server list and the settings after the upgrade.

## Failure Signals

- A workspace is missing, or the order of the workspaces changed.
- A workspace shows the sign-in page.
- A setting returned to its default value.
- The app shows an error dialog at start, or does not start.
