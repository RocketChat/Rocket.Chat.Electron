---
id: TEL-QA-007
title: Preferred server persistence
platforms: [windows, macos, linux]
priority: high
requires: [telephony_enabled, two_or_more_workspaces, test-links-html]
test_links: ["tel:+15551234567"]
expected_result: Remembering a workspace skips the picker on later calls and survives restart.
---

# Preferred Server Persistence

## Steps

| Step | Human action | Agent action | Expected result |
| --- | --- | --- | --- |
| 1 | Use a fresh profile or clear persisted app settings before starting. | Start from no preferred server. | First link opens picker. |
| 2 | Click `tel:+15551234567`. | Trigger link. | Server picker opens. |
| 3 | Check Remember choice and select workspace A. | Select server with remember true. | Dialpad opens in workspace A. |
| 4 | Click the same link again. | Trigger link again. | Picker is skipped; workspace A is used. |
| 5 | Quit and relaunch Rocket.Chat. | Restart app. | App starts normally. |
| 6 | Click the same link again. | Trigger link again. | Picker is still skipped; workspace A is used. |
| 7 | Remove or make workspace A unavailable. | Simulate stale preferred server if practical. | Picker opens instead of silently failing. |

## Evidence

- Note chosen workspace URL/title.
- Record whether restart preserved the choice.

## Failure Signals

- Preferred server is forgotten after restart.
- Stale preferred server causes no visible behavior.
- Remember checkbox stays checked after modal cancel/reopen unexpectedly.
