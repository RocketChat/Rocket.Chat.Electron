---
id: TEL-QA-002
title: Enable and disable telephony protocol handling
platforms: [windows, macos, linux]
priority: smoke
qase:
  suite: Telephony deeplinks
  priority: high
  severity: major
  status: actual
  automation: manual
  qase_id: null
requires: [test-links-html, at_least_one_workspace]
test_links: ["tel:+15551234567", "callto:+15551234567"]
expected_result: Disabled telephony ignores phone links; enabled telephony handles them.
---

# Enable And Disable Gating

## Steps

| Step | Action | Test data | Expected result | Agent action |
| --- | --- | --- | --- | --- |
| 1 | In the left vertical server list, click the three-dots/kebab button near the bottom edge below the server buttons, click `Settings`, click the `Voice & Video` tab near the top of Settings, then find the `Telephony` section heading. |  | Toggle is visible. | Navigate to Telephony settings. |
| 2 | Switch the Telephony toggle off. |  | Diagnostics section is hidden or inactive. | Set telephony toggle to off. |
| 3 | Open `test-links.html` and click `tel:+15551234567`. |  | Rocket.Chat does not place a telephony call request. | Trigger the same link. |
| 4 | Switch the Telephony toggle on. |  | Default-handler prompt or diagnostics can appear. | Set telephony toggle to on. |
| 5 | Click `tel:+15551234567` again. |  | Rocket.Chat opens the telephony dialpad flow. | Trigger the same link. |
| 6 | Click `callto:+15551234567`. |  | Rocket.Chat opens the telephony dialpad flow. | Trigger the same link. |

## Evidence

- Screenshot or screen recording showing disabled vs enabled behavior.
- Note any OS prompt shown by the browser.

## Failure Signals

- Disabled mode still opens the dialpad.
- Enabled mode ignores both `tel:` and `callto:`.
