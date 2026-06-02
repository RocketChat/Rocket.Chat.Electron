---
id: TEL-QA-010
title: Windows Default Apps for tel and callto
platforms: [windows]
priority: release
qase:
  suite: Telephony deeplinks
  priority: high
  severity: critical
  status: actual
  automation: manual
  qase_id: null
requires: [telephony_enabled, installed_windows_build, test-links-html]
test_links: ["tel:+15551234567", "callto:+15551234567"]
expected_result: Rocket.Chat appears in Windows Default Apps and can own both tel and callto.
---

# Windows Default Apps

## Review Basis

- Comparison range: `master` to `feat/telephony-deeplink`.
- Changed surface: Windows default-app detection and Settings handoff.
- User-visible risk: Windows reports Rocket.Chat as unavailable or the app sends
  testers to the wrong system settings surface.
- Hypothesis: Windows users can verify and change `tel:` / `callto:` ownership
  through the expected Default Apps UI path.
- Smallest useful proof: OS-level repro on Windows plus observed Default Apps
  state.

## Steps

| Step | Action | Test data | Expected result | Agent action |
| --- | --- | --- | --- | --- |
| 1 | Install the branch Windows build. |  | Rocket.Chat appears in Start menu/apps. | Install app. |
| 2 | In the left vertical server list, click the three-dots/kebab button near the bottom edge below the server buttons, click `Settings`, click the `Voice & Video` tab near the top of Settings, find the `Telephony` section heading, then switch Telephony on. |  | Prompt or diagnostics is available. | Set telephony toggle on. |
| 3 | Open Windows Settings -> Apps -> Default apps. |  | Default Apps window opens. | Open Default Apps settings. |
| 4 | Search or open Rocket.Chat. |  | Rocket.Chat appears as a candidate. | Locate registered app entry. |
| 5 | Assign `tel` to Rocket.Chat. |  | Windows accepts Rocket.Chat. | Set `tel` protocol default. |
| 6 | Assign `callto` to Rocket.Chat. |  | Windows accepts Rocket.Chat. | Set `callto` protocol default. |
| 7 | Open Rocket.Chat diagnostics. |  | `isDefault.tel` and `isDefault.callto` pass. | Read checks. |
| 8 | Click valid links in `test-links.html`. |  | Rocket.Chat opens telephony flow for both. | Trigger `tel` and `callto`. |

## Evidence

- Screenshot Default Apps assignment.
- Copied diagnostics JSON.

## Failure Signals

- Rocket.Chat is not listed.
- Only one protocol can be assigned.
- Diagnostics fail despite Windows showing Rocket.Chat as owner.
