---
id: CORE-2525-QA-010
title: Presence Bullet And Unread Badge Coexist As The Product Intends Per Platform
platforms: [windows, linux, macos]
priority: release
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
    unread_mention_source,
  ]
test_links: []
expected_result: When both an unread count and a presence are active, Windows and macOS show presence ONLY (the icon file is identical to the no-unread state — the Windows taskbar overlay and the macOS menu-bar title carry the count instead). Linux keeps the presence-coloured unread badge with the numeral baked into the icon, unchanged from before this branch.
---

# Presence Bullet And Unread Badge Coexist As The Product Intends Per Platform

## Review Basis

- Comparison range: `dev` to the CORE-2525 branch.
- Changed surface: `src/ui/main/icons.ts` (`getWindowsTrayIconPath`/`getMacOSTrayIconPath` ignore `badge` entirely once `presence` is set — no `-notification` variant exists for these platforms anymore; `getLinuxTrayIconPath` unchanged, keeps building the combined `presence-<presence>-notification-<badge>` filename), `src/ui/icons/WindowsTrayIcon.tsx` / `MacOSTrayIcon.tsx` (render `PresenceBullet` whenever `presence` is set, dropping the `badge` interaction entirely), `src/ui/icons/LinuxTrayIcon.tsx` (presence + badge still renders `Badge` recoloured with `PRESENCE_COLORS[presence]`; presence + no badge renders `PresenceBullet`), `src/ui/main/trayIcon.ts` (`updateTrayIconImage` passing both `badge` and `presence` on every relevant state change).
- User-visible risk: On Windows/macOS, the product decision is that presence and unread count never combine visually in the icon (taskbar overlay / menu-bar title already show the count) — a regression here would either leak a numeral/dot back into the icon file when a badge is present, or fail to show presence at all once an unread count exists. On Linux, a regression could drop either the presence colour or the unread numeral from the combined icon, or resize/reposition it versus the pre-feature badge.
- Hypothesis: With presence set (e.g. `online`) and at least one unread mention: on Windows/macOS the resolved icon path is the plain `presence-<presence>` asset, byte-identical to the icon shown with zero unread — the count is only visible via the taskbar overlay (Windows) or the menu-bar title (macOS), never in the icon file. On Linux the icon resolves to `presence-<presence>-notification-<n>`, showing the shipping unread badge shape recoloured to the presence colour with the numeral still legible, same size and position as the pre-feature unread badge.
- Smallest useful proof: Local UI repro with both conditions active simultaneously, captured as a zoomed screenshot at native icon size, compared against the presence-only render from flow 01 (Windows/macOS) and the shipping badge-only reference asset (Linux), unchanged by this branch.

## Steps

| Step | Action | Test data | Expected result | Agent action |
| ---- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1    | Sign in to a presence-supporting workspace with zero unread mentions and presence left at its default. Right-click the tray icon (Windows notification area / Linux system tray; on macOS: left-click the app icon in the menu bar at the top-right — a single click opens the same menu) and set presence to `Online` via the context menu.                                           | Presence: online, 0 unread                                                                                           | The tray icon shows the online status bullet (solid `#2DE0A5` filled circle, no cut-out), same size and position as the shipping unread badge. Capture a zoomed screenshot for baseline comparison.                                                                                                                                                                                                                        | Read the resolved icon path; on Windows/macOS assert it is `presence-online` with no badge-related suffix. On Linux assert it is the plain `presence-online`.                                                                                                                                                                                   |
| 2    | From another client/account, send this user two unread @-mentions while presence remains `Online`.                                                                                                                                                                                                                                                                                     | 2 unread mentions, presence: online                                                                                  | On Windows/macOS: the tray icon is byte-identical to step 1 — the online status bullet, no unread indicator baked in anywhere. The Windows taskbar overlay badge and the macOS menu-bar title show the numeral `2` instead. On Linux: the tray icon shows the shipping unread badge shape recoloured `#2DE0A5` with the numeral `2` in white, same as before this branch. The tray title still shows `2` on all platforms. | On Windows/macOS: read the resolved icon path; assert it is still the plain `presence-online` (unchanged from step 1) and that the count `2` appears only via the taskbar overlay / tray title, never in the icon file. On Linux: read the resolved icon path; assert it matches `presence-online-notification-2` and the tray title shows `2`. |
| 3    | On Linux only: compare the step-2 screenshot against a native-size render of the shipping badge-only reference asset, unchanged by this branch: `src/public/images/tray/linux/notification-2.png`. On Windows/macOS: compare the step-2 screenshot against the step-1 screenshot directly (they must be pixel-identical, since presence alone determines the icon on these platforms). | Screenshot from step 2 and (Linux) the shipping badge-only reference asset, or (Windows/macOS) the step-1 screenshot | Linux: the numeral badge matches the shipping unread badge's size and position; only the fill colour differs (presence green vs the shipping asset's default colour). Windows/macOS: step 1 and step 2 screenshots are indistinguishable.                                                                                                                                                                                  | Linux: overlay or measure the badge circle on both assets; they occupy the same region and both carry the numeral `2`. Windows/macOS: diff the two screenshots; assert zero pixel difference.                                                                                                                                                   |
| 4    | Mark all mentions read while presence remains `Online`, then re-check the icon.                                                                                                                                                                                                                                                                                                        | 0 unread, presence: online                                                                                           | The icon is unchanged from step 2 on Windows/macOS (it was already presence-only with no unread indicator, so nothing changes in the icon file). On Linux the numeral disappears, reverting to the plain presence bullet.                                                                                                                                                                                                  | Confirm the resolved icon path returns to `presence-online` on every platform (Windows/macOS: no change from step 2; Linux: drops the `-notification-<n>` suffix).                                                                                                                                                                              |

## Evidence

- Zoomed/cropped screenshots at native icon size for: presence-only with 0 unread (step 1) and presence with 2 unread (step 2), on all three platforms.
- Windows/macOS: confirmation that the step 1 and step 2 icon files/screenshots are identical (no combined state exists on these platforms).
- The shipping badge-only reference asset used for Linux comparison in step 3 (pre-feature baseline, unchanged by this branch): `src/public/images/tray/linux/notification-2.png`.
- Screenshot of the Windows taskbar overlay badge / macOS menu-bar title showing the unread count for step 2.
- Resolved icon file paths for each state if screenshots are inconclusive at native size.

## Failure Signals

- On Windows/macOS, the icon file changes at all between 0 and 2 unread mentions while presence stays constant (regression — no combined state should exist; the count must only ever appear via the taskbar overlay / menu-bar title).
- On Windows/macOS, any asset matching a `presence-<presence>-notification` naming pattern still exists or is resolved (this variant was removed by this branch).
- On Linux, the presence-coloured badge is a different size or position than the shipping unread badge, or the unread numeral is missing when both presence and an unread count are active.
- The combined icon fails to resolve to an existing asset (falls back to a missing-icon placeholder).
