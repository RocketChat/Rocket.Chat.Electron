---
id: TEL-QA-002
title: Enable and disable telephony protocol handling
platforms: [windows, macos, linux]
priority: smoke
requires: [test-links-html, at_least_one_workspace]
test_links: ["tel:+15551234567", "callto:+15551234567"]
expected_result: Disabled telephony ignores phone links; enabled telephony handles them.
---

# Enable And Disable Gating

## Steps

| Step | Human action | Agent action | Expected result |
| --- | --- | --- | --- |
| 1 | Open Settings -> Voice & Video -> Telephony. | Navigate to Telephony settings. | Toggle is visible. |
| 2 | Turn Telephony off. | Set telephony toggle to off. | Diagnostics section is hidden or inactive. |
| 3 | Open `test-links.html` and click `tel:+15551234567`. | Trigger the same link. | Rocket.Chat does not place a telephony call request. |
| 4 | Turn Telephony on. | Set telephony toggle to on. | Default-handler prompt or diagnostics can appear. |
| 5 | Click `tel:+15551234567` again. | Trigger the same link. | Rocket.Chat opens the telephony dialpad flow. |
| 6 | Click `callto:+15551234567`. | Trigger the same link. | Rocket.Chat opens the telephony dialpad flow. |

## Evidence

- Screenshot or screen recording showing disabled vs enabled behavior.
- Note any OS prompt shown by the browser.

## Failure Signals

- Disabled mode still opens the dialpad.
- Enabled mode ignores both `tel:` and `callto:`.
