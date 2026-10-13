---
id: REL418-QA-005
title: Store builds check the store and never use the in-app updater
platforms: [macos, windows, linux]
packages: [mas, appx, snap]
priority: smoke
qase:
  suite: Release 4.18.0 / Install and upgrade
  priority: high
  severity: major
  status: actual
  automation: manual
  qase_id: null
requires: [installed_prerelease_build]
test_links: []
expected_result: On a store build, "Check for updates now" asks the store, shows a result, and the app never downloads an update by itself.
---

# Store Builds Check The Store And Never Use The In-App Updater

## Review Basis

- Comparison range: 4.17.4..origin/dev at acaf3a712.
- Changed surface: the store packages built by the split release
  workflow (#3513, #3532). The store update path is in
  `src/updates/storeUpdates.ts`. For a store build, `setupUpdates` stops
  before electron-updater starts.
- User-visible risk: a store build downloads a GitHub package, which the
  store sandbox blocks, or shows an update that it cannot install.
- Hypothesis: a store build gets its version from the store only, and
  offers the store page as the way to update.
- Smallest useful proof: the store check on each store package, with the
  log checked for electron-updater lines.

## Steps

| Step | Action | Test data | Expected result | Agent action |
| --- | --- | --- | --- | --- |
| 1 | Install the store package. mas: install the build from TestFlight. appx: double-click the `.appx` file and click Install. snap: install the `.snap` file. | `sudo snap install --dangerous ./<file>.snap`. | The app starts. | Take a screenshot. |
| 2 | Press Command+, (macOS) or Ctrl+, (Windows, Linux). In the left sidebar of the App settings window, click General. Find the button labeled "Check for updates now". | None. | The button shows. | Take a screenshot of the General section. |
| 3 | Click "Check for updates now". | None. | Two results are valid. The app shows "No updates are available." Or the app shows "Version X is available" with a button. The button opens the store ("Open App Store", "Open Microsoft Store", or "Open Snap Store"). The app does not start a download. | Take a screenshot of the result. |
| 4 | If a store button shows, click it. | None. | The store app or the store web page opens on the Rocket.Chat listing. | Take a screenshot. |
| 5 | Click the Help menu and click Open Log Viewer. Search the log for "electron-updater" and "latest". | None. | The log has no electron-updater lines and no request for `latest-mac.yml`, `latest.yml`, or `latest-linux.yml`. | Save the log. On mas, the log file is `~/Library/Containers/chat.rocket/Data/Library/Logs/Rocket.Chat/main.log`. |

## Evidence

- Screenshots of the check result and the store page.
- The log file.

## Failure Signals

- The app downloads an update, or shows "Install update".
- The log shows electron-updater activity or a request for a `latest*.yml`
  file.
- The store button opens a page that is not the Rocket.Chat listing.
