---
id: REL418-QA-048
title: Pulling a web UI build keeps the app responsive and old bundles are pruned
platforms: [windows, macos, linux]
priority: high
qase:
  suite: Release 4.18.0 / Web UI previews
  priority: medium
  severity: normal
  status: actual
  automation: manual
  qase_id: null
requires: [installed_prerelease_build]
test_links: []
expected_result: The app stays responsive during a pull, and the ui-previews folder keeps only the bundles in use plus the three most recent.
---

# Pulling a web UI build keeps the app responsive and old bundles are pruned

## Review Basis

- Comparison range: 4.17.4..origin/dev at acaf3a712.
- Changed surface: #3536 (async extraction in `uiPreviewPackage.ts`, `pruneUiPreviews`, `.partial-` clean-up), #3525 (bundle cache in `userData/ui-previews`).
- User-visible risk: all windows, menus, and tabs freeze while a build of about 14 MB (1,440 files) extracts. Bundles of about 57 MB each fill the disk with no limit.
- Hypothesis: during a pull, you can still open menus and switch tabs. After you apply several different builds, the `ui-previews` folder holds the builds in use and the three most recently used, and nothing else. Failure mode: a frozen window for more than 1 second, or more folders than the limit. Platforms: every platform. Disk speed on Windows can change the freeze time.
- Smallest useful proof: local UI repro plus a directory listing. The author's measured event-loop lag (21 ms against 414 ms) is not a pass condition here. A freeze that a tester can see is.
- Open point: the prune of an old `.partial-` folder needs a folder that is more than one hour old. This flow checks the stale-bundle part only.

## Steps

| Step | Action | Test data | Expected result | Agent action |
| --- | --- | --- | --- | --- |
| 1 | Quit the app. Delete the `ui-previews` folder in the app data folder if it exists (macOS `~/Library/Application Support/Rocket.Chat`, Windows `%APPDATA%\Rocket.Chat`, Linux `~/.config/Rocket.Chat`). Start the app with two workspaces signed in. Turn on Developer Mode in the Help menu. | None. | The app starts. The folder does not exist. | Delete the folder and start the app. |
| 2 | Open the app settings window (macOS: app name menu, Preferences. Windows and Linux: File, App settings). Click Appearance (palette icon), and scroll to "Load a web UI build". Add `develop` and four different PR numbers that have web preview builds. | `develop`, and 4 PR numbers, for example `42364` and `42601` and two more | Five rows show. The `ui-previews` folder still does not exist, because Add downloads nothing. | Add the builds and list the folder. |
| 3 | Click Apply on the first PR row. Click Load UI. While the row shows "Downloading and applying…", click the other workspace tab, then click back. Open the View menu. | None. | The tab switch and the menu respond at once, with no pause of more than 1 second. After the pull the "UI" badge shows. | Apply and switch tabs while the row shows the loading text. |
| 4 | List the `ui-previews` folder. | Run `ls` on macOS and Linux, or `dir` on Windows. | One folder with a long name (a digest) exists. It holds files such as `index.html`. No folder name starts with `.partial-`. | List the folder. |
| 5 | In Settings, click Apply on the second PR row, then the third, fourth, and `develop` row in turn. Click Load UI each time. Wait for each pull to end. Use the same workspace each time. | None. | Each apply ends with a "UI" badge. | Apply the builds in order. |
| 6 | List the `ui-previews` folder again. | Run `ls` or `dir`. | The folder holds at most 4 digest folders: the one in use and the three most recently used. The first PR build is gone. No `.partial-` folder shows. | List the folder and count the folders. |
| 7 | Click Apply on the first PR row again. Click Load UI. | None. | The build loads again (the app pulls it again). The "UI" badge shows. | Apply and check the tab. |
| 8 | Open the View menu and click Restore server UI. | None. | The server UI loads. The `ui-previews` folder is unchanged. | Restore and list the folder. |

## Evidence

- Directory listings from steps 4 and 6.
- A note of the longest freeze that you saw in step 3.

## Failure Signals

- The window or menu does not respond while a build downloads.
- More than 4 digest folders stay after step 6.
- A `.partial-` folder stays after the apply ends.
- An apply fails with a disk error.
