---
id: REL418-QA-046
title: Refresh, persist, and apply a build to a chosen workspace
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
expected_result: Refresh reloads a workspace only when the build is newer, the list survives a restart while the workspace returns to the server UI, and the Apply to selector targets the chosen workspace.
---

# Refresh, persist, and apply a build to a chosen workspace

## Review Basis

- Comparison range: 4.17.4..origin/dev at acaf3a712.
- Changed surface: #3541 (refresh button, `ui-preview/refresh`, persisted `uiPreviewHistory`, "Apply to" selector), #3525 (a preview is in memory only).
- User-visible risk: Refresh reloads a workspace with no new build, or gives no result text. The list is lost after restart. A preview stays active after restart. Apply targets the wrong workspace.
- Hypothesis: the refresh icon button on a list row shows "Already the newest build." when nothing is newer. It shows "Updated to the newest build." when the tag moved. After a restart the list still shows its rows with dates, and no workspace has a preview. With two workspaces, the "Apply to" selector sets the target. Failure mode: the wrong text appears. Or the wrong workspace gets the preview. Or the list is lost. Or a preview comes back. Platforms: every platform.
- Open point from #3541: the author did not run the "Apply to" selector in the app. Steps 7 to 9 are that run. A "tag moved" result needs a build that changes between two checks. Step 4 records the result for the build that you have, and does not force it.
- Smallest useful proof: local UI repro. The release has no proxy tool for the tag-moved case, so that case relies on the unit tests of #3541.

## Steps

| Step | Action | Test data | Expected result | Agent action |
| --- | --- | --- | --- | --- |
| 1 | Start the app with two workspaces signed in. Open the Help menu and make sure Developer Mode has a check mark. Open the app settings window (macOS: app name menu, Preferences. Windows and Linux: File, App settings). Click Appearance (palette icon), and scroll to "Load a web UI build". Add `develop` and an open PR number. | `develop`, `42364` | Two rows show in the list. | Add both builds and read the rows. |
| 2 | Look at the "Apply to" label above the list. | None. | A labeled selector "Apply to" shows with a drop-down. It lists both workspaces by name. It shows the workspace that was in view when you opened Settings. | Read the selector. |
| 3 | In the "Apply to" selector, choose the workspace that is not in view. Click Apply on the "develop" row. Click Load UI. | None. | The dialog names the workspace you chose. After Load UI, the "develop" row shows "Active on <chosen workspace name>" in green. Only that workspace row shows "Active on this workspace: develop @ ...". The other tab has no badge. | Choose, apply, and read the rows and tabs. |
| 4 | Hover the refresh icon button (two arrows in a circle) on the "develop" row. Click it. | None. | The tooltip reads "Check for a newer build". While it runs, the row shows "Checking for a newer build…" and all three buttons are disabled. The result is "Already the newest build." or "Updated to the newest build." Record which one shows. | Click the button and read the result. |
| 5 | Click the refresh icon button on the row for the PR build, which no workspace runs. | None. | The result is "Already the newest build." or "Updated to the newest build.". No workspace reloads. | Click it and watch the tabs. |
| 6 | Click Refresh on the "develop" row again. | None. | The result is "Already the newest build.". The workspace does not reload. | Click it and watch the tab. |
| 7 | In "Apply to", choose the other workspace. Click Apply on the PR row. Click Load UI. | None. | The "Active on" line of the PR row names the second workspace. Both workspaces now show "UI" badges. | Apply and capture both tabs. |
| 8 | Quit the app fully. On macOS use Cmd+Q. On Windows and Linux use File, Quit. Start it again. Open the app settings window (macOS: app name menu, Preferences. Windows and Linux: File, App settings). Click Appearance (palette icon), and scroll to the section. | None. | The list still has both rows with the commit and build date. The rows have no "Active on" line. Both workspaces show "Using the server's UI." Both tabs have no "UI" badge. | Restart and read the section and tabs. |
| 9 | Click the trash icon button on the PR row. Quit and start the app again. Open the section. | None. | Only the "develop" row stays after the restart. | Remove, restart, and read the list. |
| 10 | Turn your network off. Click the refresh icon button on the "develop" row. Turn the network on again. | None. | The row shows red text that starts "Could not load:". The app does not hang. | Disable the network, click, and read the text. |

## Evidence

- Screenshot of the list with "Active on" text.
- Screenshot of the list after the restart.
- The result text for each Refresh click.

## Failure Signals

- Refresh reloads a workspace that already runs the newest build.
- A preview is still active after the restart.
- The list is empty after the restart.
- The "Apply to" choice loads the build into another workspace.
- Refresh with no network never ends.
