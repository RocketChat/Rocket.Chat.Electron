---
id: CORE-2525-QA-002
title: Tray Menu Presence Submenu Reflects And Changes Effective Status
platforms: [windows, linux, macos]
priority: smoke
qase:
  suite: Tray presence status
  priority: high
  severity: critical
  status: actual
  automation: manual
  qase_id: null
requires:
  [
    installed_branch_build,
    presence_supporting_workspace,
    logged_in_session,
    second_client_session,
  ]
test_links: []
expected_result: The tray menu's top-level presence item shows the current status label with a matching coloured bullet icon; opening its submenu lists Online/Away/Busy/Offline as radio items each with its own bullet, the currently effective status is checked, and selecting a different one applies it on the server.
---

# Tray Menu Presence Submenu Reflects And Changes Effective Status

## Review Basis

- Comparison range: base `dev` (default branch) to head `feat/CORE-2525-tray-presence` (PR #3466); the complete range `dev..feat/CORE-2525-tray-presence` was reviewed for this pack.
- Changed surface: `src/ui/main/trayIcon.ts` (`buildPresenceMenuItems`, `PRESENCE_OPTIONS`), `src/ui/main/icons.ts` (`getPresenceMenuIconPath`), `src/ui/icons/PresenceMenuIcon.tsx`, `src/i18n/en.i18n.json` (`tray.presence.*`), `src/servers/preload/presence.ts`.
- User-visible risk: The top-level item shows the wrong current status or wrong bullet colour, the submenu shows the wrong checked state, or clicking a submenu radio does not actually change presence on the server (a tray that looks right but failed to send).
- Hypothesis: The tray context menu shows one top-level item labeled with the account's current status (e.g. `Online`) and a matching coloured bullet icon; hovering/clicking it opens a submenu listing exactly four radio items labeled `Online`, `Away`, `Busy`, `Offline`, each with its own coloured bullet icon; the item matching the account's current `status` is checked; clicking a different one both re-checks that item, updates the top-level label/icon, and changes the account's status on the server.
- Smallest useful proof: Local UI repro plus verification against a second logged-in client (web UI) reading the account's presence indicator, not just the tray.

## Steps

| Step | Action | Test data | Expected result | Agent action |
| ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1    | On the second client (web UI or another Rocket.Chat client signed in as the same user), open the user avatar menu in the top-left of the sidebar and note the currently displayed status label (Online/Away/Busy/Offline).                                          | Logged-in web session  | A baseline status label is visible on the second client.                                                                                                                                                                                                                                       | Read the account's presence value from the second client/API.                                                                                       |
| 2    | On the desktop app, right-click the tray icon (Windows: bottom-right notification area, behind the `^` chevron if hidden; Linux: system tray/status area; on macOS: left-click the app icon in the menu bar at the top-right — a single click opens the same menu). | none                   | A context menu opens whose top item shows the current status label (e.g. `Online`) with a small coloured bullet icon to its left, and a submenu arrow indicating it expands, followed later by a separator line.                                                                               | Open/read the tray context menu template via `buildMenuTemplate`; assert the top-level presence item has a `submenu` array and an `icon`.           |
| 3    | Hover over (or click, on platforms where it opens on click) the top-level status item to reveal its submenu.                                                                                                                                                        | none                   | A submenu opens showing four items with radio-button markers (a filled or outlined circle to the left of each label) reading `Online`, `Away`, `Busy`, `Offline`, in that order, each with its own coloured bullet icon.                                                                       | Read the `submenu` array of the top-level presence item and assert it has 4 radio items, each with an `icon`.                                       |
| 4    | Confirm which of the four submenu radio items shows the filled/selected radio marker, and confirm it matches the top-level item's label from step 2.                                                                                                                | none                   | The selected radio item's label matches the baseline status noted in step 1, and matches the top-level item's own label.                                                                                                                                                                       | Assert the radio item where `checked === true` matches `activeServerPresence.presence`, and the top-level item's `label` matches the same presence. |
| 5    | Click a different radio item than the currently selected one, for example click `Busy` if `Online` was selected.                                                                                                                                                    | Target presence `busy` | The menu closes; re-opening the tray context menu (right-click again; on macOS: click the menu bar icon again) shows the top-level item now labeled `Busy` with the busy bullet icon, and re-opening its submenu shows `Busy` carrying the selected radio marker instead of the previous item. | Trigger the `click` handler for the target `PRESENCE_OPTIONS` entry and re-read the menu template.                                                  |
| 6    | Switch to the second client and re-check the status label from step 1 (refresh or wait for the reactive presence indicator to update).                                                                                                                              | none                   | The second client now shows `Busy` (or the label clicked in step 5), proving the change reached the server, not just the tray.                                                                                                                                                                 | Query `/api/v1/users.info` or the DDP user document for `status` and assert it equals the clicked value.                                            |

## Evidence

- Screenshot of the tray context menu showing the top-level status item and its expanded submenu with the four radio items and which one is checked, before and after the click.
- Screenshot or copied status text from the second client confirming the server-side value changed.

## Failure Signals

- Top-level item missing an icon or submenu, fewer or more than four presence items in the submenu, wrong order, or wrong labels.
- No submenu item is checked, or the checked item does not match the account's real status, or the top-level label disagrees with the checked submenu item.
- Clicking a radio updates the tray's own checkmark but the second client's status never changes (indicates the IPC send or `setUserStatus` call failed silently).
- Menu order changes between opens.
