---
id: TEL-QA-013
title: Localization and layout smoke
platforms: [windows, macos, linux]
priority: medium
qase:
  suite: Telephony deeplinks
  priority: medium
  severity: minor
  status: actual
  automation: manual
  qase_id: null
requires: [telephony_enabled]
test_links: []
expected_result: Telephony UI is readable without clipping in key locales.
---

# Localization And Layout Smoke

## Review Basis

- Comparison range: `master` to `feat/telephony-deeplink`.
- Changed surface: Telephony labels, settings layout, modal copy, and diagnostics
  layout across locales and viewport sizes.
- User-visible risk: New strings overflow, become untranslated, or make controls
  visually hard to find.
- Hypothesis: Telephony UI remains readable and visually findable in supported
  layout and localization conditions.
- Smallest useful proof: Local UI smoke across representative locale/layout
  states.

## Steps

| Step | Action | Test data | Expected result | Agent action |
| --- | --- | --- | --- | --- |
| 1 | Set app/system locale to English. |  | Telephony settings copy is readable. | Launch with English locale or record that locale switching is unavailable. |
| 2 | Check prompt, diagnostics, server picker, shortcut controls. |  | No clipping or overlap. | Capture each UI surface. |
| 3 | Repeat in Brazilian Portuguese. |  | Copy remains readable. | Launch with pt-BR or record that locale switching is unavailable. |
| 4 | Repeat in German. |  | Long labels remain readable. | Launch with de-DE or record that locale switching is unavailable. |
| 5 | Resize window to a narrow supported width. |  | Text wraps or truncates cleanly. | Set smaller viewport/window. |

## Evidence

- Screenshots for each locale and UI surface.

## Failure Signals

- Buttons overlap body text.
- Diagnostics details overflow outside panel.
- Server picker titles are unreadable.
