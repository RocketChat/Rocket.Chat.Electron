---
id: TEL-QA-014
title: Negative and edge cases
platforms: [windows, macos, linux]
priority: high
requires: [test-links-html]
test_links: ["tel:", "callto:?subject=empty"]
expected_result: Invalid or unsupported inputs fail safely without crashes or wrong calls.
---

# Negative And Edge Cases

## Steps

| Step | Human action | Agent action | Expected result |
| --- | --- | --- | --- |
| 1 | Disable Telephony and click a valid phone link. | Trigger `tel:+15551234567`. | No call request is placed. |
| 2 | Enable Telephony with no workspace configured. | Use a fresh profile with zero workspaces. | Phone link does not crash; no call is placed. |
| 3 | Click `tel:` from `test-links.html`. | Trigger empty `tel`. | No call request is placed. |
| 4 | Click `callto:?subject=empty`. | Trigger query-only `callto`. | No call request is placed. |
| 5 | With multiple workspaces, open picker and cancel. | Trigger link then dismiss modal. | No call request is placed. |
| 6 | Trigger two phone links quickly. | Fire links in quick succession. | App avoids duplicate/concurrent modal failures. |
| 7 | Create a stale remembered workspace by remembering a server, then removing that server from the profile. | Remove remembered server from server list. | Picker opens instead of silently failing. |

## Evidence

- Notes for each edge input and observed result.
- Screenshots for any unexpected modal or error.

## Failure Signals

- App crashes.
- Invalid input is sent to dialpad.
- Wrong workspace is used without asking.
