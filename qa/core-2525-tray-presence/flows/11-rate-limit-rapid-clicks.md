---
id: CORE-2525-QA-011
title: Rapid Presence Clicks Coalesce Without Dropping The Final Choice
platforms: [windows, linux]
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

- Comparison range: `dev` to the CORE-2525 branch.
- Changed surface: `src/servers/preload/presenceDebounce.ts` (`createPresenceRateLimiter`), its call site in `src/injected.ts` (`presenceRateLimiter.request(...)` inside `onPresenceChangeRequested`).
- User-visible risk: The server rate-limits `setUserStatus` to 1 call/sec/user; a fixed defect (found in review, not caught by earlier passing tests) had the debounce drop the user's last click inside that 1s window with no retry, leaving the account stuck on a stale status the tray never corrects. This flow proves the trailing-edge fix actually reaches the server.
- Hypothesis: Clicking `Online` then, within well under a second, clicking `Busy` results in the account's status ending on `Busy` once the rate-limit window elapses — verified on the server/second client, not just by watching the tray's own (optimistic) checkmark.
- Smallest useful proof: Local UI repro with two rapid clicks, confirmed against a second logged-in client's status display after waiting slightly over one second.

## Steps

| Step | Action | Test data | Expected result | Agent action |
| ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| 1 | Sign in to a presence-supporting workspace and, on a second client (web UI signed in as the same user), open the user avatar menu top-left of the sidebar to have the status label visible for comparison. Set the account to any known baseline status first (e.g. `Away`) and confirm on the second client. | Baseline: away | Second client shows `Away`. | Confirm baseline `status` on the server equals `away`. |
| 2 | On the desktop app, right-click the tray icon (Windows notification area / Linux system tray), click `Online`, then immediately right-click the tray icon again and click `Busy` — both clicks performed within roughly the same second, faster than a normal deliberate click-pause-click. | Rapid sequence: online, then busy | The tray's own checked radio ends up on `Busy` immediately (tray state is optimistic/local). | Issue two `requestPresenceChange` calls back to back with less than 1000ms between them: `online` then `busy`. |
| 3 | Wait slightly over one second (just past the server's 1 call/sec rate-limit window), then check the second client's status label without touching the tray again. | none | The second client now shows `Busy`, not `Online` and not still `Away` — the later click was not dropped by the rate limiter. | Query the server (`users.info`/DDP) after the wait and assert `status === 'busy'`. |
| 4 | Re-open the tray context menu on the desktop app. | none | The checked radio still reads `Busy`, matching the confirmed server value from step 3 (tray and server agree). | Re-read the tray menu template and assert the checked item is `Busy`. |

## Evidence

- Screenshot/copied text of the second client's status label before the rapid clicks, immediately after (still within the 1s window), and after waiting past the window.
- Timestamps or a screen recording showing the two tray clicks happened within roughly one second of each other.

## Failure Signals

- The second client shows `Online` (the first click) instead of `Busy` after waiting past the rate-limit window — the later request was dropped rather than coalesced.
- The second client shows the original baseline (`Away`) — neither click reached the server.
- The tray's own checkmark disagrees with the confirmed server value after the wait.
