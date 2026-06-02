---
id: TEL-QA-001
title: Telephony settings discovery
platforms: [windows, macos, linux]
priority: smoke
qase:
  suite: Telephony deeplinks
  priority: high
  severity: major
  status: actual
  automation: manual
  qase_id: null
requires: [installed_or_running_branch_build, at_least_one_workspace]
test_links: []
expected_result: Telephony settings are visible under Voice & Video and start disabled unless already configured.
---

# Telephony Settings Discovery

## Review Basis

- Comparison range: `master` to `feat/telephony-deeplink`.
- Changed surface: Settings UI under Voice & Video.
- User-visible risk: QA cannot find the new Telephony controls, or the controls
  appear in the wrong state.
- Hypothesis: A tester with no feature context can visually navigate to Settings,
  open Voice & Video, and identify the Telephony section.
- Smallest useful proof: Local UI repro against an installed or running branch
  build.

## Steps

| Step | Action | Test data | Expected result | Agent action |
| --- | --- | --- | --- | --- |
| 1 | Launch Rocket.Chat. |  | Main window is visible. | Start app and wait for main window. |
| 2 | In the left vertical server list, click the three-dots/kebab button near the bottom edge below the server buttons, then click `Settings` in the menu that opens. | Alternate path: app menu item `Settings` when the desktop menu bar is visible. | Settings screen opens. | Navigate to Settings view. |
| 3 | Click the `Voice & Video` tab. |  | Voice & Video options are visible. | Select Voice & Video settings tab. |
| 4 | Find Telephony. |  | Telephony section is present. | Search visible text for Telephony. |
| 5 | Check initial state. |  | Toggle is off unless this profile was previously configured. | Read the telephony toggle state. |

## Evidence

- Screenshot of Voice & Video showing Telephony.
- Note whether this is a fresh or reused profile.

## Failure Signals

- No Voice & Video tab.
- No Telephony section.
- Text is clipped or unreadable.
