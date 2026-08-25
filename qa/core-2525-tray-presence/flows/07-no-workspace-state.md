---
id: CORE-2525-QA-007
title: No Workspace Configured Shows An Add-Workspace Item
platforms: [windows, linux, macos]
priority: medium
qase:
  suite: Tray presence status
  priority: medium
  severity: normal
  status: actual
  automation: manual
  qase_id: null
requires: [installed_branch_build, no_workspaces_configured]
test_links: []
expected_result: With zero workspaces configured, the tray menu shows no presence radios and instead a single enabled "Add workspace" item that opens the app.
---

# No Workspace Configured Shows An Add-Workspace Item

## Review Basis

- Comparison range: base `dev` (default branch) to head `feat/CORE-2525-tray-presence` (PR #3466); the complete range `dev..feat/CORE-2525-tray-presence` was reviewed for this pack.
- Changed surface: `src/ui/main/trayIcon.ts` (`buildPresenceMenuItems`, the `!hasServers` branch), `src/i18n/en.i18n.json` (`tray.presence.addWorkspace`).
- User-visible risk: The tray menu offers presence controls with nothing to apply them to, or gives no way back into the app to add a first workspace.
- Hypothesis: On a fresh install/profile with zero workspaces added, the tray menu's presence section shows exactly one item labeled `Add workspace`, enabled, with no radios and no custom-status line; clicking it brings the main window to the front.
- Smallest useful proof: Local UI repro on a fresh app profile (or after removing all configured workspaces) reading the tray menu.

## Steps

| Step | Action | Test data | Expected result | Agent action |
| --- | --- | --- | --- | --- |
| 1    | Launch the branch build with a fresh profile/no workspaces configured, or remove every workspace from the left vertical server list (open each workspace's context/kebab menu and choose to remove it) until none remain. | none      | The main window shows the "Add a workspace"/onboarding screen with no server icons in the left server list.                                                                 | Confirm the servers collection/state is empty (`hasServers: false`).                                                                        |
| 2    | Right-click the tray icon (Windows notification area / Linux system tray; on macOS: left-click the app icon in the menu bar at the top-right — a single click opens the same menu) to open the context menu.              | none      | The menu's first item reads `Add workspace`, rendered as a normal enabled item with no radio marker. No presence radios, no custom-status line, and no sign-in item appear. | Read the tray menu template and assert the presence-section items array has exactly one entry labeled `Add workspace` with `enabled: true`. |
| 3    | Click the `Add workspace` item.                                                                                                                                                                                           | none      | The main window is brought to the front/shown, displaying the add-workspace/onboarding screen.                                                                              | Confirm the item's `click` handler shows the root window.                                                                                   |

## Evidence

- Screenshot of the tray menu showing only the `Add workspace` item.
- Screenshot of the main window's onboarding screen after clicking it.

## Failure Signals

- Any presence-related item appears despite zero configured workspaces.
- The item is missing or disabled.
- Clicking the item does nothing.
