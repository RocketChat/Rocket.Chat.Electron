---
id: TEL-QA-007
title: Preferred server persistence
platforms: [windows, macos, linux]
priority: high
qase:
  suite: Telephony deeplinks
  priority: high
  severity: major
  status: actual
  automation: manual
  qase_id: null
requires: [telephony_enabled, two_or_more_workspaces, test-links-html]
test_links: ["tel:+15551234567"]
expected_result: Remembering a workspace skips the picker on later calls and survives restart.
---

# Preferred Server Persistence

## Steps

| Step | Action | Test data | Expected result | Agent action |
| --- | --- | --- | --- | --- |
| 1 | Start with a fresh profile or clear persisted app settings before launching Rocket.Chat. |  | First link opens picker. | Start from no preferred server. |
| 2 | Click `tel:+15551234567`. |  | Server picker opens. | Trigger link. |
| 3 | Check Remember choice and select workspace A. |  | Dialpad opens in workspace A. | Select server with remember true. |
| 4 | Click the same link again. |  | Picker is skipped; workspace A is used. | Trigger link again. |
| 5 | Quit and relaunch Rocket.Chat. |  | App starts normally. | Restart app. |
| 6 | Click the same link again. |  | Picker is still skipped; workspace A is used. | Trigger link again. |
| 7 | Remove or make workspace A unavailable. |  | Picker opens instead of silently failing. | Simulate stale preferred server if practical. |

## Evidence

- Note chosen workspace URL/title.
- Record whether restart preserved the choice.

## Failure Signals

- Preferred server is forgotten after restart.
- Stale preferred server causes no visible behavior.
- Remember checkbox stays checked after modal cancel/reopen unexpectedly.
