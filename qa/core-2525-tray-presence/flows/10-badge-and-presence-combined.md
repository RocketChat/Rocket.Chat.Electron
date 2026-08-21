---
id: CORE-2525-QA-010
title: Presence Dot And Unread Badge Are Both Visible And Distinguishable Together
platforms: [windows, linux]
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
expected_result: When both an unread badge and a non-default presence are active, the tray icon renders both the presence dot and the badge overlay simultaneously, and a tester can tell them apart at native icon size.
---

# Presence Dot And Unread Badge Are Both Visible And Distinguishable Together

## Review Basis

- Comparison range: `dev` to the CORE-2525 branch.
- Changed surface: `src/ui/main/icons.ts` (`getWindowsTrayIconPath`/`getLinuxTrayIconPath` building the combined `presence-<presence>-notification-<badge>` filename), `src/ui/main/trayIcon.ts` (`updateTrayIconImage` passing both `badge` and `presence` on every relevant state change).
- User-visible risk: At 16x16 in the Windows notification area (or the equivalent small Linux tray size), a presence dot and an unread badge dot/number can visually collide into one blob, making both signals unreadable — the known visual risk called out for this feature.
- Hypothesis: With presence set to a non-default value (e.g. `busy`) and at least one unread mention pending at the same time, the combined icon shows both a presence-colored dot and a separate badge marker (numeral or dot) as distinct, non-overlapping visual elements.
- Smallest useful proof: Local UI repro with both conditions active simultaneously, captured as a zoomed screenshot at native icon size and compared against the presence-only and badge-only renders from flows 01 and 09.

## Steps

| Step | Action | Test data | Expected result | Agent action |
| ---- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1 | Sign in to a presence-supporting workspace with zero unread mentions and presence left at its default. Right-click the tray icon (Windows notification area / Linux system tray) and set presence to `Busy` via the context menu. | Presence: busy, 0 unread | The tray icon shows only the red busy dot (`#F5455C`), no numeral/badge overlay. Capture a zoomed screenshot for baseline comparison. | Read the resolved icon path; assert it matches the presence-only filename pattern with no badge suffix. |
| 2 | From another client/account, send this user two unread @-mentions while presence remains `Busy`. | 2 unread mentions, presence: busy | The tray icon now shows both the busy dot AND a badge/count indicator (e.g. the numeral `2` as the tray title, and/or a combined icon asset) simultaneously. Zoom/crop a screenshot at native size (16x16 on Windows). | Read the resolved icon path; assert it matches the combined filename pattern `presence-busy-notification-2` (or the equivalent badge-name part) and confirm the tray title shows `2`. |
| 3 | Compare the step-2 screenshot against the step-1 (presence-only) screenshot and a badge-only screenshot from flow 09 step 3 (2 unread mentions, no presence). | Screenshots from steps 1-2 and flow 09 | The presence dot and the badge marker occupy visually separate regions of the icon (not the same pixels) and a viewer can identify both the presence color and that mentions are unread from the combined icon alone. | Compare pixel regions of the three icon assets to confirm the presence dot and badge marker are in different positions/do not fully overlap. |
| 4 | Mark all mentions read while presence remains `Busy`, then re-check the icon. | 0 unread, presence: busy | The icon reverts to showing only the busy dot (matches step 1), confirming the badge cleanly detaches from the presence dot. | Confirm the resolved icon path returns to the presence-only pattern from step 1. |

## Evidence

- Zoomed/cropped screenshots at native icon size for: presence-only, badge-only (from flow 09), and combined presence+badge.
- Resolved icon file paths for each state if screenshots are inconclusive at native size.

## Failure Signals

- The presence dot and badge marker overlap or merge into a single indistinguishable blob at native size.
- Only one of the two indicators is visible when both conditions are active (the other is silently dropped).
- The combined icon fails to resolve to an existing asset (falls back to a missing-icon placeholder).
