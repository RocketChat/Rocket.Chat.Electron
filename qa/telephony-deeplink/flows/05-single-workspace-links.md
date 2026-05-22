---
id: TEL-QA-005
title: Single workspace tel and callto links
platforms: [windows, macos, linux]
priority: smoke
qase:
  suite: Telephony deeplinks
  priority: high
  severity: major
  status: actual
  automation: manual
  qase_id: null
requires: [telephony_enabled, exactly_one_workspace, test-links-html]
test_links: ["tel:+15551234567", "tel:+55 11 99999-1234", "callto:+15551234567", "callto://+491234567890"]
expected_result: Clicking valid phone links opens the dialpad in the only configured workspace.
---

# Single Workspace Links

## Review Basis

- Comparison range: `master` to `feat/telephony-deeplink`.
- Changed surface: Deep-link routing when exactly one workspace is available.
- User-visible risk: Clicking a phone link opens the wrong destination, does
  nothing, or asks for a server when only one valid workspace exists.
- Hypothesis: With one workspace, enabled Telephony routes `tel:` and `callto:`
  links directly to that workspace's call handling path.
- Smallest useful proof: Local UI repro using clickable protocol links from
  `test-links.html`.

## Steps

| Step | Action | Test data | Expected result | Agent action |
| --- | --- | --- | --- | --- |
| 1 | Confirm only one workspace is configured. |  | Exactly one workspace exists. | Count configured servers. |
| 2 | In the left vertical server list, click the three-dots/kebab button near the bottom edge below the server buttons, click `Settings`, click the `Voice & Video` tab near the top of Settings, find the `Telephony` section heading, then switch Telephony on. |  | Telephony is enabled. | Set telephony toggle on. |
| 3 | Open `test-links.html` in a browser. |  | Link page is visible. | Open local HTML file. |
| 4 | Click each valid `tel:` link. |  | Dialpad receives the normalized number. | Trigger each valid `tel:` URI. |
| 5 | Click each valid `callto:` link. |  | Dialpad receives the normalized number. | Trigger each valid `callto:` URI. |
| 6 | Return to Rocket.Chat after each click. |  | The only workspace is used; no server picker appears. | Observe app focus and workspace. |

## Evidence

- Record each link clicked and observed number.
- Screenshot the dialpad state for at least one `tel:` link and one `callto:`
  link.

## Failure Signals

- Browser opens an unrelated application.
- Server picker appears despite only one workspace.
- Query strings or formatting are included in the dialed number.
