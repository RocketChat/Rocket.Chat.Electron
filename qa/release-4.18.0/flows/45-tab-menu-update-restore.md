---
id: REL418-QA-045
title: Update and restore a web UI build from the workspace tab menu
platforms: [windows, macos, linux]
priority: high
qase:
  suite: Release 4.18.0 / Web UI previews
  priority: high
  severity: major
  status: actual
  automation: manual
  qase_id: null
requires: [installed_prerelease_build]
test_links: []
expected_result: The tab menu offers Update UI preview and Restore server UI only on a workspace that runs a preview, and both work.
---

# Update and restore a web UI build from the workspace tab menu

## Review Basis

- Comparison range: 4.17.4..origin/dev at acaf3a712.
- Changed surface: #3534 (tab context menu items in `menuBar.ts`, `updateUiPreviewWithDialog`), #3536 (label with commit after Update), #3548 (aborted loads on Restore).
- User-visible risk: the items show on the wrong workspace, Update shows a dialog or does nothing, Update loses the preview, or Restore leaves the badge.
- Hypothesis: right-click on a tab that runs a preview shows "Update UI preview" and "Restore server UI" between "Server info" and "Remove". Update reloads with no confirmation and keeps the badge. Restore removes the badge. A tab with no preview shows neither item. Failure mode: a missing or extra item, a confirmation dialog, or a stuck page. Platforms: every platform. The tab menu is a native menu, so its look differs by OS.
- Smallest useful proof: local UI repro.

## Steps

| Step | Action | Test data | Expected result | Agent action |
| --- | --- | --- | --- | --- |
| 1 | Start the app with two workspaces signed in. Open the Help menu and make sure Developer Mode has a check mark. | Two workspaces. | Two tabs show in the tab bar. | Read the tab bar. |
| 2 | Open the app settings window (macOS: app name menu, Preferences. Windows and Linux: File, App settings). Click Appearance (palette icon). Scroll to "Load a web UI build". Add `develop`. Choose the first workspace in the "Apply to" selector. Click Apply. Click Load UI. Close Settings. | `develop` | The first tab shows a red "UI" badge. The second tab has none. | Apply the build and capture both tabs. |
| 3 | Right-click the first workspace tab. | None. | A menu shows. Below "Server info" and a divider, it lists "Update UI preview" and "Restore server UI". A divider and "Remove" follow. | Right-click and read the item labels. |
| 4 | Right-click the second workspace tab. | None. | The menu has no "Update UI preview" and no "Restore server UI". Press Escape. | Right-click and read the labels. |
| 5 | Right-click the first tab. Click Update UI preview. Wait 30 seconds. | None. | No confirmation dialog shows. The workspace reloads and loads the web client again. You stay signed in. The "UI" badge stays. The tooltip still shows "UI preview: develop @ <7 characters> (...)". | Click the item and watch the page and the tooltip. |
| 6 | Right-click the first tab and click Update UI preview two times in a row within one second. | None. | The workspace reloads once or twice, without an error dialog, and ends on the web client. | Click twice and read the final page. |
| 7 | Open the Help menu and click Developer Mode to clear the check mark. Right-click the first tab and click Update UI preview. | None. | A dialog titled "Load UI preview" shows "Enable Help > Developer Mode to load UI previews." Click OK. The workspace does not reload. | Turn the setting off, click the item, and read the dialog. |
| 8 | Click Developer Mode again so it has a check mark. Right-click the first tab and click Restore server UI. Wait 40 seconds. | None. | The workspace reloads. The "UI" badge goes away. The server UI loads, signed in. | Click the item, then check the tab and the page. |
| 9 | Apply the build again (as in step 2). Open the View menu and click Restore server UI while the first workspace is in view. | None. | The same result as step 8: the badge goes away and the server UI loads. | Apply, click the menu item, and check the tab. |

## Evidence

- Screenshot of the tab menu with a preview, and without.
- Screenshot of the tab tooltip after Update.
- Screenshot of the dialog in step 7.

## Failure Signals

- The two items show on a workspace with no preview.
- Update shows a confirmation dialog.
- Update with Developer Mode off reloads the workspace.
- The workspace shows a blank page after Update or Restore.
