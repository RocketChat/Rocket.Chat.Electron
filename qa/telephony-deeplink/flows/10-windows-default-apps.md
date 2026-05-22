---
id: TEL-QA-010
title: Windows Default Apps for tel and callto
platforms: [windows]
priority: release
requires: [telephony_enabled, installed_windows_build, test-links-html]
test_links: ["tel:+15551234567", "callto:+15551234567"]
expected_result: Rocket.Chat appears in Windows Default Apps and can own both tel and callto.
---

# Windows Default Apps

## Steps

| Step | Human action | Agent action | Expected result |
| --- | --- | --- | --- |
| 1 | Install the branch Windows build. | Install app. | Rocket.Chat appears in Start menu/apps. |
| 2 | Enable Telephony. | Set telephony toggle on. | Prompt or diagnostics is available. |
| 3 | Open Windows Settings -> Apps -> Default apps. | Open Default Apps settings. | Default Apps window opens. |
| 4 | Search or open Rocket.Chat. | Locate registered app entry. | Rocket.Chat appears as a candidate. |
| 5 | Assign `tel` to Rocket.Chat. | Set `tel` protocol default. | Windows accepts Rocket.Chat. |
| 6 | Assign `callto` to Rocket.Chat. | Set `callto` protocol default. | Windows accepts Rocket.Chat. |
| 7 | Open Rocket.Chat diagnostics. | Read checks. | `isDefault.tel` and `isDefault.callto` pass. |
| 8 | Click valid links in `test-links.html`. | Trigger `tel` and `callto`. | Rocket.Chat opens telephony flow for both. |

## Evidence

- Screenshot Default Apps assignment.
- Copied diagnostics JSON.

## Failure Signals

- Rocket.Chat is not listed.
- Only one protocol can be assigned.
- Diagnostics fail despite Windows showing Rocket.Chat as owner.
