---
id: CORE-2525-QA-006
title: Logged-Out Workspace Shows A Sign-In Item Instead Of Presence Radios
platforms: [windows, linux, macos]
priority: high
qase:
  suite: Tray presence status
  priority: medium
  severity: normal
  status: actual
  automation: manual
  qase_id: null
requires: [installed_branch_build, configured_workspace_no_session]
test_links: []
expected_result: When the active workspace has no logged-in session, the tray menu shows no presence radios and instead a single enabled "Sign in to <workspace>" item that opens the app.
---

# Logged-Out Workspace Shows A Sign-In Item Instead Of Presence Radios

## Review Basis

- Comparison range: base `dev` (default branch) to head `feat/CORE-2525-tray-presence` (PR #3466); the complete range `dev..feat/CORE-2525-tray-presence` was reviewed for this pack.
- Changed surface: `src/ui/main/trayIcon.ts` (`buildPresenceMenuItems`, the `!loggedIn` branch), `src/i18n/en.i18n.json` (`tray.presence.signIn`).
- User-visible risk: The tray menu offers presence controls that cannot work (no session), or omits any path back to signing in.
- Hypothesis: With a workspace added but not signed in (or signed out), the tray menu shows exactly one item labeled `Sign in to <workspace title or URL>`, enabled, with no presence radios and no custom-status line; clicking it brings the main window to the front.
- Smallest useful proof: Local UI repro with a workspace added and its session logged out, reading the tray menu before and after clicking the sign-in item.

## Steps

| Step | Action | Test data | Expected result | Agent action |
| --- | --- | --- | --- | --- |
| 1    | Add a workspace in the left vertical server list (or use one already added) and sign out of it from the main window (open the user avatar menu top-left of the sidebar, click `Logout`), so the workspace tab exists but shows the login/sign-in screen instead of the chat UI. | A workspace with a logged-out session | The main window shows that workspace's login screen when its tab is active.                                                                                                                                                                                                                        | Confirm the server entry exists with `userLoggedIn: false` and a resolved `url`.                                                                                         |
| 2    | Minimize or hide the main window, then right-click the tray icon (Windows notification area / Linux system tray; on macOS: left-click the app icon in the menu bar at the top-right — a single click opens the same menu) to open the context menu.                             | none                                  | The menu's first item reads `Sign in to <workspace name or URL>` (matching the workspace's configured title, or its URL if no title is set), rendered as a normal enabled item with no radio marker. No `Online`/`Away`/`Busy`/`Offline` items and no custom-status line appear above or below it. | Read the tray menu template and assert the presence-section items array has exactly one entry with that label pattern and `enabled: true`, and no `type: 'radio'` items. |
| 3    | Click the `Sign in to <workspace>` item.                                                                                                                                                                                                                                        | none                                  | The main window is brought to the front/shown, displaying that workspace's login screen.                                                                                                                                                                                                           | Confirm the item's `click` handler shows the root window.                                                                                                                |

## Evidence

- Screenshot of the tray menu showing only the sign-in item, no radios.
- Screenshot of the main window coming to the front after clicking the item.

## Failure Signals

- Presence radios or a custom-status line appear despite no active session.
- The sign-in item label does not include the workspace's title/URL.
- Clicking the item does nothing or opens the wrong workspace.
