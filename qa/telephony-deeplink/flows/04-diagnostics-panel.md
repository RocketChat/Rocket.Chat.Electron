---
id: TEL-QA-004
title: Telephony diagnostics panel
platforms: [windows, macos, linux]
priority: smoke
qase:
  suite: Telephony deeplinks
  priority: high
  severity: major
  status: actual
  automation: manual
  qase_id: null
requires: [telephony_enabled]
test_links: []
expected_result: Diagnostics can be expanded, refreshed, copied, and interpreted.
---

# Diagnostics Panel

## Review Basis

- Comparison range: `master` to `feat/telephony-deeplink`.
- Changed surface: Telephony diagnostics UI and copied diagnostics payload.
- User-visible risk: Support cannot diagnose protocol-handler state because the
  panel is missing, stale, or omits platform-specific details.
- Hypothesis: Diagnostics expose enabled state, default-handler state, and useful
  platform details without requiring code knowledge.
- Smallest useful proof: Local UI repro plus copied diagnostics text or JSON.

## Steps

| Step | Action | Test data | Expected result | Agent action |
| --- | --- | --- | --- | --- |
| 1 | In the left vertical server list, click the three-dots/kebab button near the bottom edge below the server buttons, click `Settings`, click the `Voice & Video` tab near the top of Settings, then find the `Telephony` section heading. |  | Diagnostics accordion is visible. | Navigate to Telephony settings. |
| 2 | Expand Diagnostics. |  | Checks list appears. | Expand diagnostics panel. |
| 3 | Click Refresh. |  | Generated timestamp or statuses update. | Activate Refresh. |
| 4 | Click Copy. |  | Clipboard contains diagnostics JSON. | Activate Copy. |
| 5 | Review `isDefault.tel` and `isDefault.callto`. |  | Statuses reflect current OS default-handler state. | Parse copied JSON checks. |
| 6 | If a diagnostics row has a button labeled `Open Settings`, click it. |  | OS settings opens where supported. | Activate row action. |

## Evidence

- Paste copied diagnostics JSON into the result note.
- Screenshot any failed row.

## Failure Signals

- Diagnostics never load.
- Copy button does not write JSON.
- `tel` and `callto` rows are missing.
