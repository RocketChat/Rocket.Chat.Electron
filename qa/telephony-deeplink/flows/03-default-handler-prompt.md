---
id: TEL-QA-003
title: Default handler prompt
platforms: [windows, macos, linux]
priority: high
qase:
  suite: Telephony deeplinks
  priority: high
  severity: major
  status: actual
  automation: manual
  qase_id: null
requires: [telephony_toggle]
test_links: []
expected_result: Enabling telephony shows a clear default-handler prompt with working actions where supported.
---

# Default Handler Prompt

## Steps

| Step | Action | Test data | Expected result | Agent action |
| --- | --- | --- | --- | --- |
| 1 | In the left vertical server list, click the three-dots/kebab button near the bottom edge below the server buttons, click `Settings`, click the `Voice & Video` tab near the top of Settings, find the `Telephony` section heading, then switch Telephony off. |  | Prompt is not visible. | Ensure toggle is off. |
| 2 | Switch the Telephony toggle on. |  | Prompt opens once for the enable transition. | Set toggle to on. |
| 3 | Read prompt copy. |  | Copy mentions handling phone links/default app behavior. | Capture prompt title/body/buttons. |
| 4 | In the visible default-handler prompt modal, click the prompt button labeled `Open Settings` if present. |  | Windows/Linux opens default-app settings; macOS action is absent or no-op by design. | Activate Open Settings action. |
| 5 | Close the prompt. |  | Modal closes and app remains usable. | Dismiss modal. |
| 6 | Switch Telephony off, then switch it on again. |  | Prompt can appear again on a new off-to-on transition. | Repeat state transition. |

## Evidence

- Screenshot of the prompt.
- On Windows/Linux, screenshot the opened settings page. On macOS, note that no
  settings page is expected.

## Failure Signals

- Prompt blocks the app after dismissal.
- Open Settings crashes or opens an unrelated page.
- Prompt appears repeatedly without user action.
