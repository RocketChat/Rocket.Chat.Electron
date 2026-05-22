---
id: TEL-QA-013
title: Localization and layout smoke
platforms: [windows, macos, linux]
priority: medium
requires: [telephony_enabled]
test_links: []
expected_result: Telephony UI is readable without clipping in key locales.
---

# Localization And Layout Smoke

## Steps

| Step | Human action | Agent action | Expected result |
| --- | --- | --- | --- |
| 1 | Set app/system locale to English. | Launch with English locale or record that locale switching is unavailable. | Telephony settings copy is readable. |
| 2 | Check prompt, diagnostics, server picker, shortcut controls. | Capture each UI surface. | No clipping or overlap. |
| 3 | Repeat in Brazilian Portuguese. | Launch with pt-BR or record that locale switching is unavailable. | Copy remains readable. |
| 4 | Repeat in German. | Launch with de-DE or record that locale switching is unavailable. | Long labels remain readable. |
| 5 | Resize window to a narrow supported width. | Set smaller viewport/window. | Text wraps or truncates cleanly. |

## Evidence

- Screenshots for each locale and UI surface.

## Failure Signals

- Buttons overlap body text.
- Diagnostics details overflow outside panel.
- Server picker titles are unreadable.
