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
expected_result: When both an unread count and a presence are active, all three platforms show presence ONLY — the icon file is identical to the no-unread state. The Windows taskbar overlay, the macOS menu-bar title, and the Linux tray tooltip carry the count instead.
---

# Presence Bullet And Unread Badge Coexist As The Product Intends Per Platform

## Review Basis

- Comparison range: base `dev` (default branch) to head `feat/CORE-2525-tray-presence` (PR #3466); the complete range `dev..feat/CORE-2525-tray-presence` was reviewed for this pack.
- Changed surface: `src/ui/main/icons.ts` (`getWindowsTrayIconPath`/`getMacOSTrayIconPath`/`getLinuxTrayIconPath` all ignore `badge` entirely once `presence` is set — no `-notification` variant exists on any platform anymore), `src/ui/icons/WindowsTrayIcon.tsx` / `MacOSTrayIcon.tsx` / `LinuxTrayIcon.tsx` (render `PresenceBullet` whenever `presence` is set, dropping the `badge` interaction entirely), `src/ui/main/trayIcon.ts` (`updateTrayIconImage` passing both `badge` and `presence` on every relevant state change, `updateTrayIconToolTip` carrying the unread count on all platforms).
- User-visible risk: On all three platforms, the product decision is that presence and unread count never combine visually in the icon (taskbar overlay / menu-bar title / tray tooltip already show the count) — a regression here would either leak a numeral/dot back into the icon file when a badge is present, or fail to show presence at all once an unread count exists.
- Hypothesis: With presence set (e.g. `online`) and at least one unread mention: on all three platforms the resolved icon path is the plain `presence-<presence>` asset, byte-identical to the icon shown with zero unread — the count is only visible via the taskbar overlay (Windows), the menu-bar title (macOS), or the tray tooltip (Linux), never in the icon file.
- Smallest useful proof: Local UI repro with both conditions active simultaneously, captured as a zoomed screenshot at native icon size, compared against the presence-only render from flow 01.

## Steps

| Step | Action | Test data | Expected result | Agent action |
| ---- | ------ | --------- | ---------------- | ------------- |
| 1    | Sign in to a presence-supporting workspace with zero unread mentions and presence left at its default. Right-click the tray icon (Windows notification area / Linux system tray; on macOS: left-click the app icon in the menu bar at the top-right — a single click opens the same menu) and set presence to `Online` via the context menu. | Presence: online, 0 unread          | The tray icon shows the online status bullet (solid `#2DE0A5` filled circle, no cut-out). Capture a zoomed screenshot for baseline comparison.                                                                                                                                                                                         | Read the resolved icon path; on all three platforms assert it is `presence-online` with no badge-related suffix.                                                                                                                        |
| 2    | From another client/account, send this user two unread @-mentions while presence remains `Online`.                                                                                                                                                                                                                                           | 2 unread mentions, presence: online | On all three platforms: the tray icon is byte-identical to step 1 — the online status bullet, no unread indicator baked in anywhere. The Windows taskbar overlay badge and the macOS menu-bar title show the numeral `2` instead; the Linux tray tooltip shows the unread count text. The tray title still shows `2` on Windows/macOS. | On all three platforms: read the resolved icon path; assert it is still the plain `presence-online` (unchanged from step 1) and that the count `2` appears only via the taskbar overlay / tray title / tooltip, never in the icon file. |
| 3    | Compare the step-2 screenshot against the step-1 screenshot directly on all three platforms (they must be pixel-identical, since presence alone determines the icon on every platform).                                                                                                                                                      | Screenshots from steps 1 and 2      | Step 1 and step 2 screenshots are indistinguishable on all three platforms.                                                                                                                                                                                                                                                            | Diff the two screenshots on each platform; assert zero pixel difference.                                                                                                                                                                |
| 4    | Mark all mentions read while presence remains `Online`, then re-check the icon.                                                                                                                                                                                                                                                              | 0 unread, presence: online          | The icon is unchanged from step 2 on all three platforms (it was already presence-only with no unread indicator, so nothing changes in the icon file).                                                                                                                                                                                 | Confirm the resolved icon path stays `presence-online` on every platform (no change from step 2).                                                                                                                                       |

## Evidence

- Zoomed/cropped screenshots at native icon size for: presence-only with 0 unread (step 1) and presence with 2 unread (step 2), on all three platforms.
- Confirmation that the step 1 and step 2 icon files/screenshots are identical on all three platforms (no combined state exists anywhere).
- Screenshot of the Windows taskbar overlay badge / macOS menu-bar title / Linux tray tooltip showing the unread count for step 2.
- Resolved icon file paths for each state if screenshots are inconclusive at native size.

## Failure Signals

- On any platform, the icon file changes at all between 0 and 2 unread mentions while presence stays constant (regression — no combined state should exist; the count must only ever appear via the taskbar overlay / menu-bar title / tray tooltip).
- On any platform, any asset matching a `presence-<presence>-notification` naming pattern still exists or is resolved (this variant was removed by this branch on every platform).
- The combined icon fails to resolve to an existing asset (falls back to a missing-icon placeholder).
