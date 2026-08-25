---
id: CORE-2525-QA-004
title: Tray Presence Reflects Only The Active Workspace Tab
platforms: [windows, linux, macos]
priority: high
qase:
  suite: Tray presence status
  priority: high
  severity: major
  status: actual
  automation: manual
  qase_id: null
requires:
  [
    installed_branch_build,
    two_presence_supporting_workspaces,
    logged_in_session,
    second_client_session,
  ]
test_links: []
expected_result: The tray icon/menu always reflect the presence of the workspace currently open in the main window, and switching tabs updates the tray without changing presence on the workspace that lost focus.
---

# Tray Presence Reflects Only The Active Workspace Tab

## Review Basis

- Comparison range: base `dev` (default branch) to head `feat/CORE-2525-tray-presence` (PR #3466); the complete range `dev..feat/CORE-2525-tray-presence` was reviewed for this pack.
- Changed surface: `src/ui/selectors.ts` (`selectActiveServerPresence`), `src/ui/main/trayIcon.ts` (`watch(selectActiveServerPresence, ...)`), `requestPresenceChange` (scopes the change to the server matching `activeServerPresence.url`).
- User-visible risk: Switching between workspace tabs shows a stale or wrong presence dot/menu, or clicking a radio changes presence on the wrong workspace.
- Hypothesis: With two workspaces added, each with a different presence value, switching the active tab updates the tray icon and menu to match the newly active workspace only; changing presence from the tray affects only that active workspace's account.
- Smallest useful proof: Local UI repro switching tabs with two signed-in, presence-supporting workspaces set to different statuses ahead of time.
- Second-client requirement: this flow needs two independent second-client sessions, one signed in to Workspace A and one signed in to Workspace B, so each workspace's status can be checked independently of the other. A single browser tab/client cannot be signed in to two different workspace accounts at once — use two separate browser tabs/profiles (or two separate client windows), one per workspace.

## Steps

| Step | Action | Test data | Expected result | Agent action |
| --- | --- | --- | --- | --- |
| 1    | Add and sign in to two presence-supporting workspaces (Workspace A and Workspace B) in the desktop app's left vertical server list. On each workspace's own web/second client, set Workspace A's account status to `Online` and Workspace B's account status to `Busy`.                    | Workspace A -> online, Workspace B -> busy      | Both workspaces are signed in and visible as separate icons in the left server list; each shows its own distinct status on its own second client.                                                                       | Confirm both server entries exist with `userLoggedIn: true` and distinct `presence` values.              |
| 2    | In the left vertical server list, click Workspace A's icon to make it the active tab. Right-click the tray icon (Windows notification area / Linux system tray; on macOS: left-click the app icon in the menu bar at the top-right — a single click opens the same menu) to open the menu. | Active tab: Workspace A                         | The tray icon shows the online dot (`#2DE0A5` filled) and the tray menu's checked radio is `Online`.                                                                                                                    | Read `selectActiveServerPresence` and assert `url` matches Workspace A and `presence === 'online'`.      |
| 3    | In the left vertical server list, click Workspace B's icon to switch the active tab. Right-click the tray icon again (on macOS: click the menu bar icon again).                                                                                                                            | Active tab: Workspace B                         | Within a few seconds, the tray icon switches to the busy dot (`#F5455C` filled) and the tray menu's checked radio is now `Busy`, with the workspace title shown in menu items referencing Workspace B where applicable. | Re-read `selectActiveServerPresence` and assert `url` now matches Workspace B and `presence === 'busy'`. |
| 4    | With Workspace B still active, right-click the tray icon (on macOS: click the menu bar icon) and click the `Online` radio item.                                                                                                                                                            | Target presence: online, applied to Workspace B | The tray icon/menu for the active tab (Workspace B) show `Online` checked.                                                                                                                                              | Confirm the presence-change IPC targets Workspace B's `webContentsId`.                                   |
| 5    | On Workspace A's second client, confirm its status is still `Online` (unchanged by step 4), and on Workspace B's second client, confirm its status changed to `Online` (was `Busy`).                                                                                                       | none                                            | Workspace A's status is untouched; only Workspace B's status changed.                                                                                                                                                   | Query both workspaces' `users.info`/DDP status independently and assert A is unchanged, B changed.       |

## Evidence

- Screenshots of the tray icon/menu immediately after switching to each workspace tab.
- Screenshots or copied status values from both workspaces' second clients before and after step 4.

## Failure Signals

- The tray icon/menu do not update when switching tabs (stale presence from the previously active workspace).
- Clicking a radio while Workspace B is active changes Workspace A's status instead (or both).
- The tray briefly shows a third, unrelated presence value during the tab switch.
