---
id: TEL-QA-008
title: Telephony global shortcut
platforms: [windows, macos, linux]
priority: high
qase:
  suite: Telephony deeplinks
  priority: high
  severity: major
  status: actual
  automation: manual
  qase_id: null
requires: [telephony_enabled, clipboard_access, at_least_one_workspace]
test_links: []
expected_result: Configured shortcut reads clipboard on trigger and opens the telephony flow.
---

# Global Shortcut

## Review Basis

- Comparison range: `master` to `feat/telephony-deeplink`.
- Changed surface: Global shortcut and dialpad entrypoint.
- User-visible risk: The shortcut fails, opens the wrong UI, or remains active
  when Telephony is disabled.
- Hypothesis: The configured shortcut opens the expected Telephony dialpad or
  shortcut handling surface only when the feature state allows it.
- Smallest useful proof: Local keyboard/UI repro on a branch build.

## Steps

| Step | Action | Test data | Expected result | Agent action |
| --- | --- | --- | --- | --- |
| 1 | In the left vertical server list, click the three-dots/kebab button near the bottom edge below the server buttons, click `Settings`, click the `Voice & Video` tab near the top of Settings, then find the `Telephony` section heading. |  | Global shortcut controls are visible. | Navigate to Telephony settings. |
| 2 | Enable shortcut and set a non-conflicting accelerator. |  | Registration status shows success or no error. | Configure shortcut. |
| 3 | Copy `+15551234567` to clipboard. |  | Clipboard contains phone number. | Set clipboard text. |
| 4 | Press the shortcut. |  | Dialpad opens with `+15551234567`. | Dispatch accelerator. |
| 5 | Copy `tel:+55 11 99999-1234`. |  | Clipboard contains URI. | Set clipboard text. |
| 6 | Press the shortcut. |  | Dialpad opens with `+5511999991234`. | Dispatch accelerator. |
| 7 | Copy invalid text. |  | Clipboard contains invalid text. | Set clipboard text to `not a phone`. |
| 8 | Press the shortcut. |  | Dialpad opens with empty input; no malformed number is sent. | Dispatch accelerator. |
| 9 | Try a reserved/conflicting shortcut. |  | UI reports failure without crashing. | Configure known conflict if safe. |

## Evidence

- Screenshot shortcut configuration and any error state.
- Record accelerator used.

## Failure Signals

- Clipboard is read before shortcut is pressed.
- Invalid clipboard crashes or opens a malformed call.
- Conflict state is silent.
