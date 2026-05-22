---
id: TEL-QA-008
title: Telephony global shortcut
platforms: [windows, macos, linux]
priority: high
requires: [telephony_enabled, clipboard_access, at_least_one_workspace]
test_links: []
expected_result: Configured shortcut reads clipboard on trigger and opens the telephony flow.
---

# Global Shortcut

## Steps

| Step | Human action | Agent action | Expected result |
| --- | --- | --- | --- |
| 1 | Open Telephony settings. | Navigate to Telephony settings. | Global shortcut controls are visible. |
| 2 | Enable shortcut and set a non-conflicting accelerator. | Configure shortcut. | Registration status shows success or no error. |
| 3 | Copy `+15551234567` to clipboard. | Set clipboard text. | Clipboard contains phone number. |
| 4 | Press the shortcut. | Dispatch accelerator. | Dialpad opens with `+15551234567`. |
| 5 | Copy `tel:+55 11 99999-1234`. | Set clipboard text. | Clipboard contains URI. |
| 6 | Press the shortcut. | Dispatch accelerator. | Dialpad opens with `+5511999991234`. |
| 7 | Copy invalid text. | Set clipboard text to `not a phone`. | Clipboard contains invalid text. |
| 8 | Press the shortcut. | Dispatch accelerator. | Dialpad opens with empty input; no malformed number is sent. |
| 9 | Try a reserved/conflicting shortcut. | Configure known conflict if safe. | UI reports failure without crashing. |

## Evidence

- Screenshot shortcut configuration and any error state.
- Record accelerator used.

## Failure Signals

- Clipboard is read before shortcut is pressed.
- Invalid clipboard crashes or opens a malformed call.
- Conflict state is silent.
