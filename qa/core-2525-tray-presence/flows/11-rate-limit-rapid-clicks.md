---
id: CORE-2525-QA-011
title: Rapid Presence Clicks Coalesce Without Dropping The Final Choice
platforms: [windows, linux, macos]
priority: high
qase:
  suite: Tray presence status
  priority: medium
  severity: normal
  status: actual
  automation: manual
  qase_id: null
requires:
  [
    installed_branch_build,
    presence_supporting_workspace,
    logged_in_session,
    second_client_session,
  ]
test_links: []
expected_result: Clicking Online then immediately Busy within the same second results in the server ending up on Busy (the last-requested value), not silently stuck on Online or on no change at all.
---

# Rapid Presence Clicks Coalesce Without Dropping The Final Choice

## Review Basis

- Comparison range: base `dev` (default branch) to head `feat/CORE-2525-tray-presence` (PR #3466); the complete range `dev..feat/CORE-2525-tray-presence` was reviewed for this pack.
- Changed surface: `src/servers/preload/presenceDebounce.ts` (`createPresenceRateLimiter`), its call site in `src/injected.ts` (`presenceRateLimiter.request(...)` inside `onPresenceChangeRequested`).
- User-visible risk: The server rate-limits `setUserStatus` to 1 call/sec/user; a fixed defect (found in review, not caught by earlier passing tests) had the debounce drop the user's last click inside that 1s window with no retry, leaving the account stuck on a stale status the tray never corrects. This flow proves the trailing-edge fix actually reaches the server.
- Hypothesis: Clicking `Online` then, within well under a second, clicking `Busy` results in the account's status ending on `Busy` once the rate-limit window elapses — verified on the server/second client, not just by watching the tray's own (optimistic) checkmark.
- Smallest useful proof: Local UI repro with two rapid clicks, confirmed against a second logged-in client's status display via bounded polling (not a fixed wait) so client scheduling and network delay cannot produce a false failure.

## Steps

| Step | Action | Test data | Expected result | Agent action |
| --- | --- | --- | --- | --- |
| 1    | Sign in to a presence-supporting workspace and, on a second client (web UI signed in as the same user), open the user avatar menu top-left of the sidebar to have the status label visible for comparison. Set the account to any known baseline status first (e.g. `Away`) and confirm on the second client.                                                                                                                                                                                                                                         | Baseline: away                     | Second client shows `Away`.                                                                                                                                                                                                                                                                    | Confirm baseline `status` on the server equals `away`.                                                                                                                                                                                                                                                  |
| 2    | On the desktop app, right-click the tray icon (Windows notification area / Linux system tray) or, on macOS, left-click the app icon in the menu bar at the top-right (a single click opens the same menu), click `Online`, then immediately reopen the tray/menu-bar menu the same way and click `Busy` — both clicks performed within roughly the same second, faster than a normal deliberate click-pause-click. On macOS specifically: click the menu-bar icon, click `Online`, click the menu-bar icon again, click `Busy`, all within ~1 second. | Rapid sequence: online, then busy  | The tray's own checked radio ends up on `Busy` immediately (tray state is optimistic/local).                                                                                                                                                                                                   | Issue two `requestPresenceChange` calls back to back with less than 1000ms between them: `online` then `busy`.                                                                                                                                                                                          |
| 3    | Without touching the tray again, repeatedly refresh/re-check the second client's status label (or repeatedly re-query the server) every ~200ms, for up to 10 seconds total, until the status label reads `Busy` or the 10-second timeout is reached.                                                                                                                                                                                                                                                                                                  | Poll interval: 200ms, timeout: 10s | Within the polling window the second client's status label settles on `Busy`, not `Online` and not still `Away` — the later click was not dropped by the rate limiter. If the status has not become `Busy` by the 10-second timeout, treat this step as failed rather than continuing to wait. | Poll the server (`users.info`/DDP) for `status` on a bounded interval (e.g. every 200ms) up to a 10-second timeout; assert the polled value reaches `busy` before the timeout, and record the elapsed time it took to settle; fail the assertion if the timeout is reached without `status === 'busy'`. |
| 4    | Re-open the tray context menu on the desktop app (right-click the tray icon on Windows/Linux; on macOS left-click the app icon in the menu bar at the top-right).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     | none                               | The checked radio still reads `Busy`, matching the confirmed server value from step 3 (tray and server agree).                                                                                                                                                                                 | Re-read the tray menu template and assert the checked item is `Busy`.                                                                                                                                                                                                                                   |

## Evidence

- Screenshot/copied text of the second client's status label before the rapid clicks, immediately after (still within the rate-limit window), and once polling confirms the final `Busy` value.
- Timestamps or a screen recording showing the two tray clicks happened within roughly one second of each other.
- The final polled status value and the elapsed time (ms) it took to settle on `Busy`, or the fact that the 10-second timeout was reached without settling.

## Failure Signals

- The second client shows `Online` (the first click) instead of `Busy` before the polling timeout elapses — the later request was dropped rather than coalesced.
- The second client shows the original baseline (`Away`) — neither click reached the server.
- The polling timeout (10s) is reached without the status ever becoming `Busy`.
- The tray's own checkmark disagrees with the confirmed server value once polling settles.
