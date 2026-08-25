---
id: CORE-2525-QA-009
title: Unread Badge Behavior Is Unchanged By Presence
platforms: [windows, linux, macos]
priority: release
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
    unread_mention_source,
  ]
test_links: []
expected_result: The tray icon title/tooltip/badge overlay for unread mentions and messages behaves exactly as before this branch, regardless of the current presence value.
---

# Unread Badge Behavior Is Unchanged By Presence

## Review Basis

- Comparison range: `dev` to the CORE-2525 branch.
- Changed surface: `src/ui/main/trayIcon.ts` (`updateTrayIconImage`, `updateTrayIconTitle`, `updateTrayIconToolTip` — all pre-existing, now called alongside the new presence-aware `getTrayIconPath`), `src/ui/main/icons.ts` (`getBadgeNamePart`, `getWindowsTrayIconPath`, `getLinuxTrayIconPath`).
- User-visible risk: Threading presence into the same icon-resolution path as the badge accidentally changes badge-only behavior (wrong icon, wrong tooltip text, wrong numeric title) for users who never touch presence.
- Hypothesis: On a presence-supporting, logged-in workspace, `presence` is always defined (seeded by `Presence.get`), so the icon always resolves through the `presence-<presence>-notification-<n>` naming pattern; the regression this flow guards against is that the tray title text, tooltip text, and badge numeral stay byte-identical to the pre-feature behavior regardless of which presence value is currently active — not that a bare `notification-<n>` icon is reachable from this workspace.
- Smallest useful proof: Local UI repro comparing tooltip text and taskbar count/title against the existing tooltip i18n strings (`tray.tooltip.*`), which were not modified by this branch, across two different presence values.

## Steps

| Step | Action | Test data | Expected result | Agent action |
| --- | --- | --- | --- | --- |
| 1    | Sign in to a presence-supporting workspace and ensure it has zero unread mentions/messages. Note the account's current presence value (e.g. `online`) — presence is always set on this kind of workspace, so it stays active for the rest of this flow. Hover the mouse over the tray icon without clicking (Windows notification area / Linux system tray; on macOS: the app icon in the menu bar at the top-right) to read its tooltip text. | Presence recorded, e.g. `online`                    | Tooltip reads the app name followed by "no unread message" (exact string from `tray.tooltip.noUnreadMessage`). Tray icon shows no numeric title/badge overlay, and its dot still shows the recorded presence colour.                                                                                           | Read the tray's current tooltip text and title string, and confirm the resolved icon path is `presence-<recorded presence>` with no `notification-<n>` suffix (no badge).                           |
| 2    | From another client or account, send this user an @-mention in a channel they are a member of, so an unread mention count appears.                                                                                                                                                                                                                                                                                                                                                                                    | 1 unread @-mention, presence unchanged from step 1  | The tray icon's title (visible next to/under the icon depending on OS taskbar style) shows the numeral `1`; hovering the tray icon shows tooltip text "you have a unread mention/direct message" (singular form from `tray.tooltip.unreadMention`). The icon's presence-coloured dot is unchanged from step 1. | Read the tray title and tooltip text; assert they match the pre-existing i18n templates unchanged by this branch, and that the resolved icon path is `presence-<recorded presence>-notification-1`. |
| 3    | Send a second unread @-mention from another account/client.                                                                                                                                                                                                                                                                                                                                                                                                                                                           | 2 unread @-mentions, presence unchanged from step 1 | The tray icon's title shows `2`; tooltip text switches to the plural form "you have 2 unread mentions/direct messages" (`tray.tooltip.unreadMention_plural`).                                                                                                                                                  | Confirm the pluralized tooltip renders with the correct count interpolated, and that the resolved icon path is `presence-<recorded presence>-notification-2`.                                       |
| 4    | Change presence via the tray menu (right-click the tray icon on Windows/Linux; on macOS left-click the app icon in the menu bar at the top-right) (e.g. to `Busy`) while the 2 unread @-mentions are still pending, then re-check the tray title and tooltip.                                                                                                                                                                                                                                                                                                                                                                         | Presence: busy, 2 unread @-mentions unchanged       | The title still shows `2` and the tooltip still shows the same plural mention text as step 3 — unaffected by the presence change. Only the icon's dot colour and file path (`presence-busy-notification-2`) reflect the new presence.                                                                          | Re-read tray title/tooltip after the presence change and assert they are identical to step 3's values, and that the resolved icon path is `presence-busy-notification-2`.                           |
| 5    | Mark all @-mentions as read in the app, then re-check the tray title/tooltip.                                                                                                                                                                                                                                                                                                                                                                                                                                         | 0 unread @-mentions                                 | The title clears (empty) and the tooltip returns to "no unread message" text, same as step 1, regardless of the presence set in step 4.                                                                                                                                                                        | Confirm title/tooltip reset independently of the current presence value.                                                                                                                            |

## Evidence

- Screenshots/copied text of the tray tooltip at 0, 1, and 2 unread @-mentions.
- Screenshot of the tray icon title showing the numeral count.
- A native-size crop of the tray icon at the 2-unread-@-mentions state from step 3 (this will be presence-coloured, since presence is always set on a presence-supporting workspace), for size/position comparison against flow 10's combined presence+badge icon.
- A native-size render of the shipping badge-only reference asset, unchanged by this branch, as the pre-feature baseline: `src/public/images/tray/darwin/notificationTemplate.png` + `notificationTemplate@2x.png` on macOS, `src/public/images/tray/win32/notification-2.ico` on Windows, `src/public/images/tray/linux/notification-2.png` on Linux.
- Confirmation that presence changes in step 4 did not alter title/tooltip text.

## Failure Signals

- Tooltip text differs from the existing `tray.tooltip.*` strings (wording, pluralization, or app name interpolation broken).
- The numeral title fails to appear or shows the wrong count.
- Title/tooltip behavior changes when comparing different presence values (icon file resolution regression from mixing the badge and presence dimensions), or the resolved icon path does not match the `presence-<presence>-notification-<n>` pattern at any step.
