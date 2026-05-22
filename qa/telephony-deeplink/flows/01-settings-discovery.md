---
id: TEL-QA-001
title: Telephony settings discovery
platforms: [windows, macos, linux]
priority: smoke
requires: [installed_or_running_branch_build, at_least_one_workspace]
test_links: []
expected_result: Telephony settings are visible under Voice & Video and start disabled unless already configured.
---

# Telephony Settings Discovery

## Steps

| Step | Human action | Agent action | Expected result |
| --- | --- | --- | --- |
| 1 | Launch Rocket.Chat. | Start app and wait for main window. | Main window is visible. |
| 2 | Open Settings. | Navigate to Settings view. | Settings screen opens. |
| 3 | Open Voice & Video. | Select Voice & Video settings tab. | Voice & Video options are visible. |
| 4 | Find Telephony. | Search visible text for Telephony. | Telephony section is present. |
| 5 | Check initial state. | Read the telephony toggle state. | Toggle is off unless this profile was previously configured. |

## Evidence

- Screenshot of Voice & Video showing Telephony.
- Note whether this is a fresh or reused profile.

## Failure Signals

- No Voice & Video tab.
- No Telephony section.
- Text is clipped or unreadable.

