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
- Hypothesis: With presence left at its default/unset value, unread mention counts and unread-message dots produce the exact same tray title text, tooltip text, and icon file naming pattern (`notification-<n>` / `notification-dot` / `notification-plus-9`) as before, with no `presence-` prefix appearing when presence is unset.
- Smallest useful proof: Local UI repro comparing tooltip text and taskbar count/title against the existing tooltip i18n strings (`tray.tooltip.*`), which were not modified by this branch.

## Steps

| Step | Action | Test data | Expected result | Agent action |
| --- | --- | --- | --- | --- |
| 1    | Sign in to a presence-supporting workspace and ensure it has zero unread mentions/messages. Right-click the tray icon (Windows notification area / Linux system tray) and hover over it (do not open the context menu) to read its tooltip text. | none                                          | Tooltip reads the app name followed by "no unread message" (exact string from `tray.tooltip.noUnreadMessage`). Tray icon shows no numeric title/badge overlay.                                                                                      | Read the tray's current tooltip text and title string.                                                            |
| 2    | From another client or account, send this user an @-mention in a channel they are a member of, so an unread mention count appears.                                                                                                               | 1 unread @-mention                            | The tray icon's title (visible next to/under the icon depending on OS taskbar style) shows the numeral `1`; hovering the tray icon shows tooltip text "you have a unread mention/direct message" (singular form from `tray.tooltip.unreadMention`). | Read the tray title and tooltip text; assert they match the pre-existing i18n templates unchanged by this branch. |
| 3    | Send a second unread @-mention from another account/client.                                                                                                                                                                                      | 2 unread @-mentions                           | The tray icon's title shows `2`; tooltip text switches to the plural form "you have 2 unread mentions/direct messages" (`tray.tooltip.unreadMention_plural`).                                                                                       | Confirm the pluralized tooltip renders with the correct count interpolated.                                       |
| 4    | Change presence via the tray menu (e.g. to `Busy`) while the 2 unread @-mentions are still pending, then re-check the tray title and tooltip.                                                                                                    | Presence: busy, 2 unread @-mentions unchanged | The title still shows `2` and the tooltip still shows the same plural mention text as step 3 — unaffected by the presence change.                                                                                                                   | Re-read tray title/tooltip after the presence change and assert they are identical to step 3's values.            |
| 5    | Mark all @-mentions as read in the app, then re-check the tray title/tooltip.                                                                                                                                                                    | 0 unread @-mentions                           | The title clears (empty) and the tooltip returns to "no unread message" text, same as step 1, regardless of the presence set in step 4.                                                                                                             | Confirm title/tooltip reset independently of the current presence value.                                          |

## Evidence

- Screenshots/copied text of the tray tooltip at 0, 1, and 2 unread @-mentions.
- Screenshot of the tray icon title showing the numeral count.
- Zoomed/cropped screenshot of the tray icon at native size for the 2-unread-@-mentions state (badge-only, no presence set), for size/position comparison against flow 10's combined presence+badge icon.
- Confirmation that presence changes in step 4 did not alter title/tooltip text.

## Failure Signals

- Tooltip text differs from the existing `tray.tooltip.*` strings (wording, pluralization, or app name interpolation broken).
- The numeral title fails to appear or shows the wrong count.
- Badge-only behavior changes when presence is set vs. unset (icon file resolution regression from mixing the two dimensions).
