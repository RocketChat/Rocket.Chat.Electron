---
id: CORE-2525-QA-003
title: Custom Status Text Appears As A Read-Only Menu Line Or Is Omitted
platforms: [windows, linux]
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
    presence_supporting_workspace,
    logged_in_session,
    second_client_session,
  ]
test_links: []
expected_result: A set custom status message appears as a disabled tray menu line; when absent or cleared, the line does not appear at all.
---

# Custom Status Text Appears As A Read-Only Menu Line Or Is Omitted

## Review Basis

- Comparison range: `dev` to the CORE-2525 branch.
- Changed surface: `src/ui/main/trayIcon.ts` (`buildPresenceMenuItems`, the `statusText` disabled item), `src/servers/preload/presenceStatusText.ts`, the REST `users.info` fetch in `src/injected.ts`.
- User-visible risk: Custom status text is shown as clickable/editable (misleading, since the tray cannot edit it), or a stale/empty status text lingers in the menu after being cleared.
- Hypothesis: When the account has a non-empty custom status message, the tray menu shows it as an extra item below the presence radios that cannot be clicked (grayed out); when the account has no custom status message, no such line appears.
- Smallest useful proof: Local UI repro with the status message set and then cleared on the second client, re-reading the tray menu after each change.

## Steps

| Step | Action | Test data | Expected result | Agent action |
| ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------- |
| 1 | On the second client (web UI signed in as the same user), open the user avatar menu top-left of the sidebar, click the current status label to open the status editor, and type a custom message, e.g. `In a meeting`, then confirm/save. | Custom status text `In a meeting` | The second client shows `In a meeting` next to the user's status. | Set the custom status message via the web client or `setUserStatus` REST/DDP call. |
| 2 | On the desktop app, right-click the tray icon (Windows notification area / Linux system tray) to open the context menu. Wait a few seconds first if the app was already running, since the tray caches the status text and re-fetches it on presence-change requests and login. | none | Below the four presence radio items and above the separator, an extra menu line reads `In a meeting`. This line has no radio marker and appears visually dimmed/grayed compared to the radio items above it. | Read the tray menu template and assert the last item before the separator has `label: 'In a meeting'` and `enabled: false`. |
| 3 | Attempt to click the `In a meeting` line. | none | Nothing happens; the menu does not close differently and no status change occurs (the item is not clickable). | Confirm the item has no `click` handler / `enabled === false`. |
| 4 | On the second client, clear the custom status message (open the status editor again and remove the text, then confirm/save). | Empty custom status text | The second client no longer shows a custom status message next to the user's status. | Set the custom status message to empty/undefined. |
| 5 | On the desktop app, trigger a presence change from the tray (click any radio item) to force a re-fetch of the status text, then right-click the tray icon again to re-open the menu. | none | The `In a meeting` line is gone entirely; the menu goes directly from the four presence radios to the separator line. | Re-read the tray menu template and assert no disabled non-radio item is present between the radios and the separator. |

## Evidence

- Screenshot of the tray menu with the custom status line visible and grayed out.
- Screenshot of the tray menu after clearing the status, showing the line is absent.

## Failure Signals

- The custom status line is clickable or otherwise interactive.
- The line persists after the status text was cleared on the server (stale cache).
- The line never appears even though the second client confirms a non-empty status message.
