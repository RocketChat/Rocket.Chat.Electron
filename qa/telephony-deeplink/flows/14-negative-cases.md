---
id: TEL-QA-014
title: Negative and edge cases
platforms: [windows, macos, linux]
priority: high
qase:
  suite: Telephony deeplinks
  priority: high
  severity: major
  status: actual
  automation: manual
  qase_id: null
requires: [test-links-html]
test_links: ["tel:", "callto:?subject=empty"]
expected_result: Invalid or unsupported inputs fail safely without crashes or wrong calls.
---

# Negative And Edge Cases

## Steps

| Step | Action | Test data | Expected result | Agent action |
| --- | --- | --- | --- | --- |
| 1 | Disable Telephony and click a valid phone link. |  | No call request is placed. | Trigger `tel:+15551234567`. |
| 2 | In a fresh profile with zero workspaces, use the left vertical server list and click the three-dots/kebab button near the bottom edge below the server buttons, click `Settings`, click the `Voice & Video` tab near the top of Settings, find the `Telephony` section heading, then switch Telephony on. |  | Phone link does not crash; no call is placed. | Use a fresh profile with zero workspaces. |
| 3 | Click `tel:` from `test-links.html`. |  | No call request is placed. | Trigger empty `tel`. |
| 4 | Click `callto:?subject=empty`. |  | No call request is placed. | Trigger query-only `callto`. |
| 5 | With multiple workspaces, open picker and cancel. |  | No call request is placed. | Trigger link then dismiss modal. |
| 6 | Trigger two phone links quickly. |  | App avoids duplicate/concurrent modal failures. | Fire links in quick succession. |
| 7 | Create a stale remembered workspace by remembering a server, then removing that server from the profile. |  | Picker opens instead of silently failing. | Remove remembered server from server list. |

## Evidence

- Notes for each edge input and observed result.
- Screenshots for any unexpected modal or error.

## Failure Signals

- App crashes.
- Invalid input is sent to dialpad.
- Wrong workspace is used without asking.
