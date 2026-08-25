---
id: CORE-2525-QA-005
title: Disconnected Workspace Disables Presence Radios With A Reconnecting Notice
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
    presence_supporting_workspace,
    logged_in_session,
    network_disconnect_control,
  ]
test_links: []
expected_result: While the active workspace is disconnected or reconnecting, the four presence radios in the top-level presence item's submenu are disabled and a disabled "Disconnected — trying to reconnect..." line is shown; a merely unknown (not-yet-reported) connection state does NOT trigger this.
---

# Disconnected Workspace Disables Presence Radios With A Reconnecting Notice

## Review Basis

- Comparison range: base `dev` (default branch) to head `feat/CORE-2525-tray-presence` (PR #3466); the complete range `dev..feat/CORE-2525-tray-presence` was reviewed for this pack.
- Changed surface: `src/ui/main/trayIcon.ts` (`isDisconnected`/`isConnected` in `buildPresenceMenuItems`), `src/injected.ts` (`connectionStatusMap` inside the `userPresenceStatus` autorun), `src/ui/icons/DisconnectedBadge.tsx` (tray icon overlay shown while disconnected).
- User-visible risk: A regression previously made every startup look disconnected because `undefined` (pre-first-push connection state) was treated as disconnected; this flow proves that is fixed and that a real disconnect still disables the radios correctly.
- Hypothesis: Only real `connecting`/`disconnected`/`failed`/`waiting`/`offline` DDP connection states disable the radios and show the reconnecting line; a fresh app launch before the first connection status push behaves as connected (radios enabled, no reconnecting line).
- Smallest useful proof: Local UI repro that (a) checks the tray menu immediately at cold launch before disconnecting, and (b) forces a real network disconnect and re-checks the menu and the tray icon's appearance.
- Icon note: while disconnected, the tray/menu-bar icon overlay is a filled amber circle with a vertical exclamation mark cut out of it (same style and footprint as the presence status bullets — a solid disc, not a hollow ring), so it stays legible at menu-bar size on all three platforms.

## Steps

| Step | Action | Test data | Expected result | Agent action |
| ---- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1    | Cold-launch the desktop app fresh (fully quit first, not just hidden) with a presence-supporting workspace already configured and a healthy network connection, then immediately right-click the tray icon (Windows notification area / Linux system tray; on macOS: left-click the app icon in the menu bar at the top-right — a single click opens the same menu) as soon as the main window appears, before any manual action. | none             | The four presence radios in the top-level presence item's submenu (`Online`, `Away`, `Busy`, `Offline`) are enabled (not grayed out) and no `Disconnected — trying to reconnect...` line is present, even in the brief window before the first connection status has been reactively pushed.                                                                                                                                                                                          | Read the tray menu template at the earliest observable point after launch; assert all radio items have `enabled: true` and no disabled non-radio "Disconnected" item exists.                                                              |
| 2    | With the app running and the workspace connected, disconnect the machine's network (disable Wi-Fi/Ethernet, or use a firewall rule to block the workspace's domain) so the workspace visibly shows a reconnecting/offline banner in the main window.                                                                                                                                                                              | Network disabled | The main window shows a connection-lost/reconnecting indicator (standard Rocket.Chat reconnect banner).                                                                                                                                                                                                                                                                                                                                                                               | Force the underlying Meteor DDP connection into a `connecting`/`failed`/`waiting`/`offline` state.                                                                                                                                        |
| 3    | Right-click the tray icon again (on macOS: click the menu bar icon again) while still disconnected.                                                                                                                                                                                                                                                                                                                               | none             | The four presence radios in the top-level presence item's submenu are now grayed out/disabled (clicking them does nothing), and a new disabled line reads `Disconnected — trying to reconnect...` positioned after the top-level presence item and before the separator. The tray/menu-bar icon itself now shows a filled amber circle with a vertical exclamation mark cut out of it (not the hollow-ring look of an earlier build), same size and position as the presence bullets. | Read the tray menu template; assert all radio items have `enabled: false` and a disabled item with that exact label is present. Read the resolved icon path/pixel buffer and confirm the overlay is the filled amber disconnected bullet. |
| 4    | Attempt to click one of the disabled radio items, e.g. `Busy`.                                                                                                                                                                                                                                                                                                                                                                    | none             | No visible change occurs; the checked radio stays on whatever it was before the disconnect.                                                                                                                                                                                                                                                                                                                                                                                           | Confirm the disabled item has no effective `click` action / the presence value does not change.                                                                                                                                           |
| 5    | Restore the network connection and wait for the main window's reconnect banner to disappear, then right-click the tray icon again (on macOS: click the menu bar icon again).                                                                                                                                                                                                                                                      | Network restored | The radios re-enable and the `Disconnected — trying to reconnect...` line disappears from the menu.                                                                                                                                                                                                                                                                                                                                                                                   | Re-read the tray menu template; assert radios are `enabled: true` and the disconnected item is absent.                                                                                                                                    |

## Evidence

- Screenshot of the tray menu immediately after cold launch (step 1) showing enabled radios.
- Screenshot of the tray menu while disconnected (step 3) showing disabled radios and the reconnecting line.
- Zoomed/cropped screenshot of the tray/menu-bar icon at native size while disconnected (step 3), showing the filled amber circle with the exclamation cut-out.
- Screenshot after reconnecting (step 5) showing radios enabled again.

## Failure Signals

- Radios appear disabled with a "Disconnected" line at cold launch before any real disconnect occurred (the regression this flow guards against).
- Radios stay enabled while genuinely disconnected, allowing clicks that silently fail to reach the server.
- The reconnecting line persists after the connection is restored.
- The disconnected tray icon renders as a hollow/outlined ring instead of a filled amber disc (unreadable at menu-bar size — the earlier-build regression this shape change fixes), or the exclamation cut-out shows the rocket glyph instead of the transparent background.
- The disconnected tray icon changes appearance based on unread mention count. On all three platforms, `DisconnectedBadge` ignores unread count entirely — disconnected always resolves to the same `disconnected` asset (`disconnected.png`/`disconnected.ico`) regardless of unread messages/mentions; the count itself is only ever visible via the Windows taskbar overlay or the macOS menu-bar title, which stay active while disconnected.
