---
id: CORE-2525-QA-008
title: Unsupported Workspace Hides Presence Items And Custom Status Entirely
platforms: [windows, linux, macos]
priority: high
qase:
  suite: Tray presence status
  priority: medium
  severity: normal
  status: actual
  automation: manual
  qase_id: null
requires:
  [
    installed_branch_build,
    legacy_server_without_presence_status,
    logged_in_session,
  ]
test_links: []
expected_result: On a workspace whose server does not report a user status field, presence radios and any custom-status line are hidden entirely (not shown disabled), while the rest of the tray menu (Show/Hide, Quit) still works normally.
---

# Unsupported Workspace Hides Presence Items And Custom Status Entirely

## Review Basis

- Comparison range: base `dev` (default branch) to head `feat/CORE-2525-tray-presence` (PR #3466); the complete range `dev..feat/CORE-2525-tray-presence` was reviewed for this pack.
- Changed surface: `src/ui/main/trayIcon.ts` (`buildPresenceMenuItems`, the `supported === false` early return), `src/injected.ts` (`presenceSupported = Boolean(u) && u?.status !== undefined`).
- User-visible risk: A previously-found ordering bug returned "unsupported" before the logged-out check, so an unsupported + logged-out workspace incorrectly offered no sign-in option; this flow proves presence hiding does not swallow the sign-in/add-workspace items either.
- Hypothesis: When signed in to a workspace whose account document has no `status` field (an older/unsupported server), the tray menu shows zero presence radios and no custom-status line, with the separator directly followed by `Show`/`Hide` and `Quit`; the menu structure for logged-out/no-workspace states from flows 06/07 is unaffected by this check.
- Smallest useful proof: Local UI repro against a legacy Rocket.Chat server build known not to expose `status` on the user document (or a mocked/stubbed account without a `status` field), reading the tray menu.

## Steps

| Step | Action | Test data | Expected result | Agent action |
| --- | --- | --- | --- | --- |
| 1    | Sign in to a workspace pointed at a legacy server version that does not publish a `status` field on the user document (per the verified contract, presence support was proven live against 8.8.0-develop; use an older/unsupported build for this negative case), making it the active tab in the left vertical server list. | Legacy/unsupported server, logged-in session | The main window loads the workspace normally (chat UI visible), with no visible error.                                                                                                                                                                                           | Confirm the active legacy-server entry has `userLoggedIn: true` and `presenceSupported: false`.                                 |
| 2    | Right-click the tray icon (Windows notification area / Linux system tray; on macOS: left-click the app icon in the menu bar at the top-right — a single click opens the same menu) to open the context menu.                                                                                                                 | none                                         | No `Online`/`Away`/`Busy`/`Offline` radios appear, no custom-status line appears, and no disabled placeholder text about presence appears either — the presence section is fully absent, not shown-and-disabled. The menu starts directly with `Show`/`Hide` followed by `Quit`. | Read the tray menu template and assert `buildPresenceMenuItems` returned an empty array, and no leading separator was inserted. |
| 3    | Confirm the rest of the menu still works: click `Hide` (or `Show`, depending on current window state).                                                                                                                                                                                                                       | none                                         | The main window hides or shows as expected, unaffected by the unsupported presence check.                                                                                                                                                                                        | Confirm the `Show`/`Hide` item's click handler still toggles `rootWindowState.visible`.                                         |
| 4    | Switch the active tab to a different, presence-supporting workspace (if one is configured) and re-open the tray menu.                                                                                                                                                                                                        | Presence-supporting workspace                | The presence radios reappear for that workspace, confirming the hiding is per-workspace, not a global disable.                                                                                                                                                                   | Re-read the tray menu template for the newly active, supported workspace and assert radios are present.                         |

## Evidence

- Screenshot of the tray menu on the unsupported workspace showing no presence section at all.
- Screenshot of the tray menu after switching to a supported workspace showing radios again.

## Failure Signals

- Presence radios or custom-status line appear (even disabled) on an unsupported workspace.
- The unsupported check also suppresses the sign-in or add-workspace items when combined with logged-out/no-workspace states.
- `Show`/`Hide`/`Quit` stop working when the presence section is empty.
