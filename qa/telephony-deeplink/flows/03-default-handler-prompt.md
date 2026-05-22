---
id: TEL-QA-003
title: Default handler prompt
platforms: [windows, macos, linux]
priority: high
requires: [telephony_toggle]
test_links: []
expected_result: Enabling telephony shows a clear default-handler prompt with working actions where supported.
---

# Default Handler Prompt

## Steps

| Step | Human action | Agent action | Expected result |
| --- | --- | --- | --- |
| 1 | Start with Telephony off. | Ensure toggle is off. | Prompt is not visible. |
| 2 | Turn Telephony on. | Set toggle to on. | Prompt opens once for the enable transition. |
| 3 | Read prompt copy. | Capture prompt title/body/buttons. | Copy mentions handling phone links/default app behavior. |
| 4 | Click Open Settings if present. | Activate Open Settings action. | Windows/Linux opens default-app settings; macOS action is absent or no-op by design. |
| 5 | Close the prompt. | Dismiss modal. | Modal closes and app remains usable. |
| 6 | Turn Telephony off, then on again. | Repeat state transition. | Prompt can appear again on a new off-to-on transition. |

## Evidence

- Screenshot of the prompt.
- On Windows/Linux, screenshot the opened settings page. On macOS, note that no
  settings page is expected.

## Failure Signals

- Prompt blocks the app after dismissal.
- Open Settings crashes or opens an unrelated page.
- Prompt appears repeatedly without user action.
