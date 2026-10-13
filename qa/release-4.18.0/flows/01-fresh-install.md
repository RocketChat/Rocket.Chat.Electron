---
id: REL418-QA-001
title: Each package installs, starts, and shows the build under test
platforms: [macos, windows, linux]
packages: [dmg, pkg, mas, exe, msi, appx, appimage, deb, rpm, snap, targz]
priority: smoke
qase:
  suite: Release 4.18.0 / Install and upgrade
  priority: high
  severity: critical
  status: actual
  automation: manual
  qase_id: null
requires: [installed_prerelease_build]
test_links: []
expected_result: The package installs without a security warning, the app starts, and the settings window shows the version of the build under test.
---

# Each Package Installs, Starts, And Shows The Build Under Test

## Review Basis

- Comparison range: 4.17.4..origin/dev at acaf3a712.
- Changed surface: release packaging and signing. #3513 and #3532 split
  `build-release.yml` into a prepare job and seven packaging jobs. #3499
  changed the macOS keychain step of code signing. #3511 and #3502 changed
  the dependencies and the Node engine range.
- User-visible risk: a package is missing, unsigned, not notarized, or
  does not start. macOS can block an unsigned app. Windows SmartScreen can
  warn about an unsigned installer.
- Hypothesis: each of the 11 package types of the build under test installs on a
  clean machine. The app starts. The app reports the version of the build under test.
- Smallest useful proof: install each package on its own OS. The release
  workflow checks that the assets exist, but not that they install.

## Steps

| Step | Action | Test data | Expected result | Agent action |
| --- | --- | --- | --- | --- |
| 1 | Remove Rocket.Chat from the machine if it is installed. On macOS, drag Rocket.Chat from Applications to the Trash. On Windows, use Settings > Apps. On Linux, use the package manager. | A machine with no Rocket.Chat install. | No Rocket.Chat app is on the machine. | Check that `/Applications/Rocket.Chat.app` (macOS), the Apps list (Windows), or the package (`dpkg -l rocketchat`, `rpm -q rocketchat`, `snap list rocketchat`) is absent. |
| 2 | Download the package for this target from the GitHub release of the build under test (see `Build under test` in the pack README). For `mas`, install the build from TestFlight instead. | `gh release download <build under test> -p '<pattern>' -D <new empty folder>`. Patterns: `*-mac.dmg`, `*-mac.pkg`, `*-win-x64.exe` (or `-ia32`, `-arm64`, or the universal `*-win.exe`), `*-win-x64.msi`, `*-win-x64.appx`, `*.AppImage`, `*.deb`, `*.rpm`, `*.snap`, `*.tar.gz`. | The file is on the disk. | Run the `gh release download` command and record the file name and size. |
| 3 | Install the package with the normal method for its type. dmg: open it and drag Rocket.Chat to Applications. pkg: double-click it and complete the installer. exe and msi: double-click them. appx: double-click it and click Install. AppImage: make it executable. deb, rpm, snap: install them with the package manager. tar.gz: extract it. | `sudo apt install ./<file>.deb`, `sudo dnf install ./<file>.rpm`, `sudo snap install --dangerous ./<file>.snap`, `chmod +x <file>.AppImage`. | The install completes. macOS shows no "cannot be opened" or "damaged" message. The Windows installer shows the publisher name, not "Unknown publisher". | Record the install output. On Windows, right-click the installer, click Properties, and open the Digital Signatures tab. Record the signer. |
| 4 | Start Rocket.Chat from the Launchpad or Applications folder (macOS), the Start menu (Windows), or the application menu or the AppImage file (Linux). | None. | The main window opens. It shows the add-workspace screen. | Take a screenshot of the main window. |
| 5 | Press Command+, on macOS or Ctrl+, on Windows and Linux. The App settings window opens. Look at the bottom of its left sidebar, under the section list. | None. | The bottom of the sidebar shows the version of the build under test and a copyright line. | Take a screenshot of the sidebar bottom. On macOS, run `defaults read /Applications/Rocket.Chat.app/Contents/Info.plist CFBundleShortVersionString` and expect the version of the build under test. |
| 6 | On macOS only, check the signature and the notarization of the installed app. | `codesign -dv --verbose=2 /Applications/Rocket.Chat.app` and `spctl -a -vv /Applications/Rocket.Chat.app`. | `codesign` shows the Rocket.Chat Developer ID team (dmg, pkg) or the App Store identity (mas). For dmg and pkg, `spctl` shows `accepted` and `source=Notarized Developer ID`. | Run both commands and paste the output in the evidence. |
| 7 | Quit Rocket.Chat. On macOS, click the Rocket.Chat menu at the left of the menu bar, then click Quit Rocket.Chat. On Windows and Linux, click the File menu at the top left of the window, then click Quit Rocket.Chat. | None. | The app closes. No Rocket.Chat process stays. | Check the process list (`pgrep -l Rocket.Chat` on macOS and Linux, Task Manager on Windows). |

## Evidence

- The package file name and size.
- The installer signature (Windows) or the `codesign` and `spctl` output
  (macOS).
- A screenshot of the settings sidebar with the version.

## Failure Signals

- A package is missing from the release, or does not install.
- macOS shows "cannot be opened because the developer cannot be verified"
  or "is damaged".
- Windows shows "Unknown publisher".
- The app does not start, or shows a version other than the build under test.
