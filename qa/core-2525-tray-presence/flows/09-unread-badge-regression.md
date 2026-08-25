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
expected_result: The tray icon title/tooltip/badge overlay for unread mentions and messages behaves exactly as before this branch, regardless of the current presence value. On all three platforms, once presence is known the tray icon shows presence ONLY — no unread indicator baked into the artwork at all — because the count is already shown via the Windows taskbar overlay, the macOS menu-bar title, or the Linux tray tooltip.
---

# Unread Badge Behavior Is Unchanged By Presence

## Review Basis

- Comparison range: base `dev` (default branch) to head `feat/CORE-2525-tray-presence` (PR #3466); the complete range `dev..feat/CORE-2525-tray-presence` was reviewed for this pack.
- Changed surface: `src/ui/main/trayIcon.ts` (`updateTrayIconImage`, `updateTrayIconTitle`, `updateTrayIconToolTip` — all pre-existing, now called alongside the new presence-aware `getTrayIconPath`), `src/ui/main/icons.ts` (`getWindowsTrayIconPath`, `getLinuxTrayIconPath`, `getMacOSTrayIconPath`).
- User-visible risk: Threading presence into the same icon-resolution path as the badge accidentally changes badge-only behavior (wrong icon, wrong tooltip text, wrong numeric title) for users who never touch presence. Separately, all three platforms deliberately never bake any unread indicator into the tray icon artwork once presence is known (the taskbar overlay / menu-bar title / tray tooltip already shows it) — a regression here would either resurrect a `-notification` icon variant or drop the presence bullet entirely.
- Hypothesis: On a presence-supporting, logged-in workspace, `presence` is always defined (seeded by `Presence.get`), so on all three platforms the icon always resolves to the plain `presence-<presence>` asset regardless of unread count — the badge value is ignored entirely once presence is set. The regression this flow guards against is that the tray title text, tooltip text, and badge numeral (via title/overlay/tooltip, not the icon file) stay byte-identical to the pre-feature behavior regardless of which presence value is currently active.
- Smallest useful proof: Local UI repro comparing tooltip text and taskbar count/title against the existing tooltip i18n strings (`tray.tooltip.*`), which were not modified by this branch, across two different presence values.

## Steps

| Step | Action | Test data | Expected result | Agent action |
| ---- | ------ | --------- | ---------------- | ------------- |
| 1    | Sign in to a presence-supporting workspace and ensure it has zero unread mentions/messages. Note the account's current presence value (e.g. `online`) — presence is always set on this kind of workspace, so it stays active for the rest of this flow. Hover the mouse over the tray icon without clicking (Windows notification area / Linux system tray; on macOS: the app icon in the menu bar at the top-right) to read its tooltip text. | Presence recorded, e.g. `online`                    | Tooltip reads the app name followed by "no unread message" (exact string from `tray.tooltip.noUnreadMessage`). Tray icon shows no numeric title/badge overlay, and its dot still shows the recorded presence colour.                                                                                                                                             | Read the tray's current tooltip text and title string, and confirm the resolved icon path is `presence-<recorded presence>` with no `-notification` suffix (no badge), on all three platforms.                                                                                                                           |
| 2    | From another client or account, send this user an @-mention in a channel they are a member of, so an unread mention count appears.                                                                                                                                                                                                                                                                                                             | 1 unread @-mention, presence unchanged from step 1  | The tray icon's title (visible next to/under the icon depending on OS taskbar style) shows the numeral `1`; hovering the tray icon shows tooltip text "you have a unread mention/direct message" (singular form from `tray.tooltip.unreadMention`). The icon's presence bullet shape/colour is unchanged from step 1 (no unread indicator added to the artwork). | Read the tray title and tooltip text; assert they match the pre-existing i18n templates unchanged by this branch. On all three platforms assert the resolved icon path is still the plain `presence-<recorded presence>` (unchanged from step 1 — the `1` is only in the title/overlay/tooltip, never in the icon file). |
| 3    | Send a second unread @-mention from another account/client.                                                                                                                                                                                                                                                                                                                                                                                    | 2 unread @-mentions, presence unchanged from step 1 | The tray icon's title shows `2`; tooltip text switches to the plural form "you have 2 unread mentions/direct messages" (`tray.tooltip.unreadMention_plural`).                                                                                                                                                                                                    | Confirm the pluralized tooltip renders with the correct count interpolated. On all three platforms assert the resolved icon path is still the plain `presence-<recorded presence>` (unchanged from step 2 — the icon file never varies with the count once presence is known).                                           |
| 4    | Change presence via the tray menu (right-click the tray icon on Windows/Linux; on macOS left-click the app icon in the menu bar at the top-right) (e.g. to `Busy`) while the 2 unread @-mentions are still pending, then re-check the tray title and tooltip.                                                                                                                                                                                  | Presence: busy, 2 unread @-mentions unchanged       | The title still shows `2` and the tooltip still shows the same plural mention text as step 3 — unaffected by the presence change. Only the icon's bullet colour/shape and file path reflect the new presence.                                                                                                                                                    | Re-read tray title/tooltip after the presence change and assert they are identical to step 3's values. On all three platforms assert the resolved icon path is the plain `presence-busy` (no `-notification` suffix at all).                                                                                             |
| 5    | Mark all @-mentions as read in the app, then re-check the tray title/tooltip.                                                                                                                                                                                                                                                                                                                                                                  | 0 unread @-mentions                                 | The title clears (empty) and the tooltip returns to "no unread message" text, same as step 1, regardless of the presence set in step 4.                                                                                                                                                                                                                          | Confirm title/tooltip reset independently of the current presence value.                                                                                                                                                                                                                                                 |

## Evidence

- Screenshots/copied text of the tray tooltip at 0, 1, and 2 unread @-mentions, on all three platforms.
- Screenshot of the tray icon title showing the numeral count, and (Windows) the taskbar overlay badge showing the count.
- A native-size crop of the tray icon at the 2-unread-@-mentions state from step 3 on all three platforms (this will be presence-coloured/shaped only — identical to the icon shown before any unread arrived), for comparison against flow 10's presence-only behaviour.
- Confirmation that no dedicated notification/badge asset exists on any platform anymore — an unread count with unknown presence resolves to the plain default icon (`default.ico` / `defaultTemplate.png` / `default.png`), since the count is only ever shown via the taskbar overlay (Windows), menu-bar title (macOS), or tray tooltip (Linux).
- Confirmation that presence changes in step 4 did not alter title/tooltip text.

## Failure Signals

- Tooltip text differs from the existing `tray.tooltip.*` strings (wording, pluralization, or app name interpolation broken).
- The numeral title/taskbar overlay fails to appear or shows the wrong count.
- Title/tooltip behavior changes when comparing different presence values (icon file resolution regression from mixing the badge and presence dimensions).
- On any platform, the resolved icon path varies with the unread count at all (e.g. contains a numeral, or gains any `-notification` suffix) once presence is known — the count must only ever appear via the title/taskbar overlay/tooltip, never baked into the icon file; the resolved path must stay the plain `presence-<presence>` regardless of unread count.
- On any platform, an unread count with unknown presence resolves to anything other than the plain default icon (`default.ico` / `defaultTemplate.png` / `default.png`) — in particular, a regression that resurrects a dedicated notification/badge asset, since no such fallback asset exists anymore on any platform.
