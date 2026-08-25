---
id: CORE-2525-QA-010
title: Presence Dot And Unread Badge Are Both Visible And Distinguishable Together
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
expected_result: When both an unread count and a presence are active, the tray icon uses the shipping unread-badge circle (same size and position) filled with the presence colour and showing the unread numeral.
---

# Presence Dot And Unread Badge Are Both Visible And Distinguishable Together

## Review Basis

- Comparison range: `dev` to the CORE-2525 branch.
- Changed surface: `src/ui/main/icons.ts` (`getWindowsTrayIconPath`/`getLinuxTrayIconPath` building the combined `presence-<presence>-notification-<badge>` filename), `src/ui/main/trayIcon.ts` (`updateTrayIconImage` passing both `badge` and `presence` on every relevant state change).
- User-visible risk: Recoloring the shipping unread circle for presence could hide the unread count, or change the circle's size/position versus the pre-feature unread icon.
- Hypothesis: With presence set (e.g. `online`) and at least one unread mention, the icon is the original badge overlay (same size and place as shipping `notification-N`) filled with the presence colour and showing the numeral.
- Smallest useful proof: Local UI repro with both conditions active simultaneously, captured as a zoomed screenshot at native icon size and compared against the presence-only render from flow 01 and the shipping badge-only reference asset (unchanged by this branch), which serves as the pre-feature baseline.

## Steps

| Step | Action | Test data | Expected result | Agent action |
| --- | --- | --- | --- | --- |
| 1    | Sign in to a presence-supporting workspace with zero unread mentions and presence left at its default. Right-click the tray icon (Windows notification area / Linux system tray; on macOS: left-click the app icon in the menu bar at the top-right — a single click opens the same menu) and set presence to `Online` via the context menu.                  | Presence: online, 0 unread                                                    | The tray icon shows only the green presence circle (`#2DE0A5`), same size and position as the shipping unread badge, with no numeral. Capture a zoomed screenshot for baseline comparison. | Read the resolved icon path; assert it matches the presence-only filename pattern with no badge suffix.       |
| 2    | From another client/account, send this user two unread @-mentions while presence remains `Online`.                                                                                                                                                                                                                                                            | 2 unread mentions, presence: online                                           | The tray icon shows the shipping unread circle (same size/position as a no-presence `notification-2` icon) filled `#2DE0A5` with the numeral `2` in white. The tray title still shows `2`. | Read the resolved icon path; assert it matches `presence-online-notification-2` and the tray title shows `2`. |
| 3    | Compare the step-2 screenshot against a native-size render of the shipping badge-only reference asset, unchanged by this branch: `src/public/images/tray/darwin/notificationTemplate.png` + `notificationTemplate@2x.png` on macOS, `src/public/images/tray/win32/notification-2.ico` on Windows, `src/public/images/tray/linux/notification-2.png` on Linux. | Screenshot from step 2 and the platform's shipping badge-only reference asset | The circle matches the shipping unread badge's size and position; only the fill colour differs (presence green vs the shipping asset's default colour).                                    | Overlay or measure the badge circle on both assets; they occupy the same region.                              |
| 4    | Mark all mentions read while presence remains `Online`, then re-check the icon.                                                                                                                                                                                                                                                                               | 0 unread, presence: online                                                    | The icon reverts to the green empty circle from step 1 (numeral gone, circle stays).                                                                                                       | Confirm the resolved icon path returns to the presence-only pattern from step 1.                              |

## Evidence

- Zoomed/cropped screenshots at native icon size for: presence-only (this flow's step 1) and combined presence+badge (this flow's step 2).
- The shipping badge-only reference asset used for comparison in step 3 (pre-feature baseline, unchanged by this branch): `src/public/images/tray/darwin/notificationTemplate.png` + `notificationTemplate@2x.png` on macOS, `src/public/images/tray/win32/notification-2.ico` on Windows, `src/public/images/tray/linux/notification-2.png` on Linux.
- Resolved icon file paths for each state if screenshots are inconclusive at native size.

## Failure Signals

- The combined circle is a different size or position than the shipping unread badge.
- The unread numeral is missing when both presence and an unread count are active.
- The combined icon fails to resolve to an existing asset (falls back to a missing-icon placeholder).
