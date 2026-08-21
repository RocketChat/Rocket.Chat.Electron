---
id: CORE-2525-QA-002
title: Tray Menu Presence Radios Reflect And Change Effective Status
platforms: [windows, linux]
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
expected_result: The tray menu lists Online/Away/Busy/Offline as radio items, the currently effective status is checked, and selecting a different one applies it on the server.
---

# Tray Menu Presence Radios Reflect And Change Effective Status

## Review Basis

- Comparison range: `dev` to the CORE-2525 branch.
- Changed surface: `src/ui/main/trayIcon.ts` (`buildPresenceMenuItems`, `PRESENCE_OPTIONS`), `src/i18n/en.i18n.json` (`tray.presence.*`), `src/servers/preload/presence.ts`.
- User-visible risk: The menu shows the wrong checked state, or clicking a radio does not actually change presence on the server (a tray that looks right but failed to send).
- Hypothesis: The tray context menu shows exactly four radio items labeled `Online`, `Away`, `Busy`, `Offline`; the item matching the account's current `status` is checked; clicking a different one both re-checks that item and changes the account's status on the server.
- Smallest useful proof: Local UI repro plus verification against a second logged-in client (web UI) reading the account's presence indicator, not just the tray.

## Steps

| Step | Action | Test data | Expected result | Agent action |
| ---- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| 1 | On the second client (web UI or another Rocket.Chat client signed in as the same user), open the user avatar menu in the top-left of the sidebar and note the currently displayed status label (Online/Away/Busy/Offline). | Logged-in web session | A baseline status label is visible on the second client. | Read the account's presence value from the second client/API. |
| 2 | On the desktop app, right-click the tray icon (Windows: bottom-right notification area, behind the `^` chevron if hidden; Linux: system tray/status area). | none | A context menu opens showing four items with radio-button markers (a filled or outlined circle to the left of each label) reading `Online`, `Away`, `Busy`, `Offline`, in that order, followed by a separator line. | Open/read the tray context menu template via `buildMenuTemplate`. |
| 3 | Confirm which of the four radio items shows the filled/selected radio marker. | none | The selected radio item's label matches the baseline status noted in step 1. | Assert the radio item where `checked === true` matches `activeServerPresence.presence`. |
| 4 | Click a different radio item than the currently selected one, for example click `Busy` if `Online` was selected. | Target presence `busy` | The menu closes; re-opening the tray context menu (right-click again) shows `Busy` now carrying the selected radio marker instead of the previous item. | Trigger the `click` handler for the target `PRESENCE_OPTIONS` entry and re-read the menu template. |
| 5 | Switch to the second client and re-check the status label from step 1 (refresh or wait for the reactive presence indicator to update). | none | The second client now shows `Busy` (or the label clicked in step 4), proving the change reached the server, not just the tray. | Query `/api/v1/users.info` or the DDP user document for `status` and assert it equals the clicked value. |

## Evidence

- Screenshot of the tray context menu showing the four radio items and which one is checked, before and after the click.
- Screenshot or copied status text from the second client confirming the server-side value changed.

## Failure Signals

- Fewer or more than four presence items, wrong order, or wrong labels.
- No item is checked, or the checked item does not match the account's real status.
- Clicking a radio updates the tray's own checkmark but the second client's status never changes (indicates the IPC send or `setUserStatus` call failed silently).
- Menu order changes between opens.
