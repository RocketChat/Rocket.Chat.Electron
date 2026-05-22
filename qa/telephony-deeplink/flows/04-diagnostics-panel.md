---
id: TEL-QA-004
title: Telephony diagnostics panel
platforms: [windows, macos, linux]
priority: smoke
requires: [telephony_enabled]
test_links: []
expected_result: Diagnostics can be expanded, refreshed, copied, and interpreted.
---

# Diagnostics Panel

## Steps

| Step | Human action | Agent action | Expected result |
| --- | --- | --- | --- |
| 1 | Open Settings -> Voice & Video -> Telephony. | Navigate to Telephony settings. | Diagnostics accordion is visible. |
| 2 | Expand Diagnostics. | Expand diagnostics panel. | Checks list appears. |
| 3 | Click Refresh. | Activate Refresh. | Generated timestamp or statuses update. |
| 4 | Click Copy. | Activate Copy. | Clipboard contains diagnostics JSON. |
| 5 | Review `isDefault.tel` and `isDefault.callto`. | Parse copied JSON checks. | Statuses reflect current OS default-handler state. |
| 6 | If a row has Open Settings, click it. | Activate row action. | OS settings opens where supported. |

## Evidence

- Paste copied diagnostics JSON into the result note.
- Screenshot any failed row.

## Failure Signals

- Diagnostics never load.
- Copy button does not write JSON.
- `tel` and `callto` rows are missing.

