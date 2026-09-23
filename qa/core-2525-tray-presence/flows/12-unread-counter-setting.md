---
id: CORE-2525-QA-012
title: Unread Counter Tray Icon Setting Restores The Pre-4.17 Badge
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
expected_result: With "Unread counter in tray icon" off (the default) the tray icon shows presence only; turning it on immediately replaces the presence bullet with the pre-4.17 unread badge (dot, 1-9 or 9+ on Windows/Linux, a dot on macOS), turning it off restores presence, and the choice survives a restart.
---

# Unread Counter Tray Icon Setting Restores The Pre-4.17 Badge

## Review Basis

- Comparison range: base `dev` to head `fix/tray-unread-indicator` (GitHub issue #3484); the complete range was reviewed for this flow.
- Changed surface: `src/ui/components/SettingsView/features/TrayIconUnreadCounter.tsx` (settings window General section, directly under the tray icon toggle), `src/ui/reducers/isTrayIconUnreadCounterEnabled.ts`, `src/ui/main/icons.ts` (`getTrayIconPath` `showUnreadCounter`), `src/ui/main/trayIcon.ts` (new setting watcher), the restored `notification-*` / `notificationTemplate` tray assets.
- User-visible risk: Users who relied on the tray badge (Windows with small taskbar buttons, Linux with no taskbar overlay) keep missing unread messages; or the setting changes the default for everyone; or the icon only updates on the next unread change instead of when the toggle flips.
- Hypothesis: The default stays presence-only; the toggle swaps the tray artwork to the unread badge immediately and back again, disconnected still wins, and the value persists.
- Smallest useful proof: Unit specs (`icons.spec.ts`, `trayIcon.main.spec.ts`, `settingsToggles.spec.tsx`, `isTrayIconUnreadCounterEnabled.spec.ts`) plus this local UI repro for the painted icon.

## Steps

| Step | Action | Test data | Expected result | Agent action |
| --- | --- | --- | --- | --- |
| 1    | Sign in to a presence-supporting workspace with zero unread messages. Press `Ctrl+,` (Windows/Linux) or `Cmd+,` (macOS) to open the settings window; the left sidebar shows "General" selected. Near the top of the General section find the toggle "Tray icon" (macOS: "Menu bar extra") and, directly under it, the toggle "Unread counter in tray icon" (macOS: "Unread indicator in menu bar extra"). | Fresh profile or one upgraded from 4.17.x | The "Unread counter in tray icon" toggle is off. The tray icon (Windows notification area / Linux system tray; macOS menu bar, top-right) shows the rocket with the presence bullet in its bottom-right corner. | Read `isTrayIconUnreadCounterEnabled` from the store (expect `false`) and the resolved tray icon path (`presence-<presence>`). |
| 2    | From another account, send this user one @-mention. Look at the tray icon.                                                                                                                                                                                                                                                                                                                                | 1 unread @-mention                        | The tray icon still shows the presence bullet, not a number (default behaviour unchanged). The count appears only on the Windows taskbar overlay, the macOS menu-bar title or the Linux tray tooltip.           | Assert the resolved path is still `presence-<presence>`.                                                                       |
| 3    | In the settings window, turn "Unread counter in tray icon" on. Do not send any new message. Look at the tray icon.                                                                                                                                                                                                                                                                                        | Toggle on, still 1 unread                 | Without any new message, the bottom-right corner of the tray icon switches from the presence bullet to a red circle with a white `1` (Windows/Linux) or a filled dot on the monochrome rocket (macOS).          | Assert the resolved path is `notification-1.ico` / `notification-1.png` / `notificationTemplate.png`.                          |
| 4    | Send enough further @-mentions to reach 10 or more.                                                                                                                                                                                                                                                                                                                                                       | 10+ unread @-mentions                     | Windows/Linux shows the red circle with `9+`; macOS keeps the dot.                                                                                                                                              | Assert `notification-plus-9.*` on Windows/Linux.                                                                               |
| 5    | Mark everything as read.                                                                                                                                                                                                                                                                                                                                                                                  | 0 unread                                  | The tray icon shows the plain grey rocket with no bullet and no badge (presence is not shown in this mode).                                                                                                     | Assert the path is `default.ico` / `default.png` / `defaultTemplate.png`.                                                      |
| 6    | Developer mode only: open the app menu bar item "Developer" and check "Simulate Disconnected". Uncheck it afterwards.                                                                                                                                                                                                                                                                                     | Simulated disconnect, toggle still on     | The tray icon shows the grey rocket with the amber `!` badge while disconnected, and returns to the step 5 icon afterwards.                                                                                     | Assert `disconnected.*` while simulated.                                                                                       |
| 7    | Right-click the tray icon (Windows notification area / Linux system tray; on macOS left-click the app icon in the menu bar at the top-right) and click the last menu item, "Quit", to exit fully. Start the app again, then press `Ctrl+,` / `Cmd+,` to reopen the settings window on its "General" section.                                                                                                                                                                                                                                                                                                          | Restart                                   | "Unread counter in tray icon" is still on, and the tray icon still uses the unread badge artwork.                                                                                                               | Read the persisted value from the store after restart (`true`).                                                                |
| 8    | Turn "Unread counter in tray icon" off.                                                                                                                                                                                                                                                                                                                                                                   | Toggle off                                | The tray icon returns to the rocket with the presence bullet immediately, without any new message arriving.                                                                                                     | Assert the path is `presence-<presence>` again.                                                                                |
| 9    | Turn the "Tray icon" toggle (macOS: "Menu bar extra") off.                                                                                                                                                                                                                                                                                                                                                | Tray icon disabled                        | The "Unread counter in tray icon" toggle becomes greyed out and cannot be clicked. Turn "Tray icon" back on afterwards.                                                                                         | Assert the toggle's checkbox is `disabled`.                                                                                    |

## Evidence

- Native-size crops of the tray icon for steps 2, 3, 4, 5 and 8 on each platform.
- A screenshot of the settings window General section showing both tray toggles.

## Failure Signals

- The toggle is on by default, or upgrading changes existing users' tray icon.
- The tray icon only changes on the next unread change instead of when the toggle flips.
- In counter mode the presence bullet and the badge are drawn together, or presence shows when there are no unreads.
- The macOS badge renders in colour or disappears in dark/Liquid Glass menu bars (the dot must follow the template tint like the pre-4.17 icon).
- The setting resets after a restart.
