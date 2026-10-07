---
id: CORE-2525-QA-013
title: Menu Bar Unread Count Can Be Hidden On macOS
platforms: [macos]
priority: release
qase:
  suite: Tray presence status
  priority: medium
  severity: minor
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
expected_result: With "Unread count in menu bar" on (the default) the number of unread mentions shows next to the menu bar extra; turning it off removes the number immediately without changing the icon or the Dock badge, and the choice survives a restart.
---

# Menu Bar Unread Count Can Be Hidden On macOS

## Review Basis

- Comparison range: base `dev` to head `fix/tray-unread-indicator` (CORE-2703); the complete range was reviewed for this flow.
- Changed surface: `src/ui/components/SettingsView/features/MenuBarUnreadCount.tsx` (settings window General section, macOS only), `src/ui/reducers/isMenuBarUnreadCountEnabled.ts`, `src/ui/main/trayIcon.ts` (`updateTrayIconTitle` and its new watcher).
- User-visible risk: The number cannot be hidden, disappears for users who never touched the setting, or only clears on the next unread change.
- Hypothesis: The default keeps the number; the toggle clears and restores the title immediately and persists.
- Smallest useful proof: `trayIcon.main.spec.ts` (menu bar unread count wiring) and `isMenuBarUnreadCountEnabled.spec.ts`, plus this local UI repro.

## Steps

| Step | Action | Test data | Expected result | Agent action |
| --- | --- | --- | --- | --- |
| 1 | Sign in to a workspace and have another account send this user two @-mentions. Look at the app icon in the macOS menu bar at the top-right of the screen. | 2 unread @-mentions | The number `2` appears right next to the rocket icon in the menu bar. | Confirm the tray title is `2`. |
| 2 | Press `Cmd+,` to open the settings window; the left sidebar shows "General" selected. Find the toggle "Unread count in menu bar", directly under "Unread indicator in menu bar extra", near the top of the section. | Default settings | The toggle is on. | Read `isMenuBarUnreadCountEnabled` from the store (expect `true`). |
| 3 | Turn "Unread count in menu bar" off. Do not send any new message. Look at the menu bar. | Toggle off | The `2` next to the rocket icon disappears immediately; the icon itself and the red Dock badge are unchanged. | Confirm the tray title is empty. |
| 4 | Have the other account send one more @-mention. | 3 unread @-mentions | No number appears next to the menu bar icon; the Dock badge shows `3`. | Confirm the tray title stays empty. |
| 5 | Click the app icon in the menu bar at the top-right of the screen and click the last menu item, "Quit". Start the app again and press `Cmd+,` to reopen the settings window on its "General" section. | Restart | "Unread count in menu bar" is still off and no number appears next to the menu bar icon. | Read the persisted value (`false`). |
| 6 | Turn "Unread count in menu bar" back on. | Toggle on | The number `3` reappears next to the menu bar icon immediately. | Confirm the tray title is `3`. |

## Evidence

- Menu bar crops for steps 1, 3 and 6, and a screenshot of the Dock badge at step 4.

## Failure Signals

- The number is hidden by default or after upgrading.
- The number only clears or returns on the next unread change.
- The Dock badge or the menu bar icon artwork changes along with the number.
- The setting resets after a restart.
