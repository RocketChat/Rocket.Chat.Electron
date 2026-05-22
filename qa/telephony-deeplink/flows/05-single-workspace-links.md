---
id: TEL-QA-005
title: Single workspace tel and callto links
platforms: [windows, macos, linux]
priority: smoke
requires: [telephony_enabled, exactly_one_workspace, test-links-html]
test_links: ["tel:+15551234567", "tel:+55 11 99999-1234", "callto:+15551234567", "callto://+491234567890"]
expected_result: Clicking valid phone links opens the dialpad in the only configured workspace.
---

# Single Workspace Links

## Steps

| Step | Human action | Agent action | Expected result |
| --- | --- | --- | --- |
| 1 | Confirm only one workspace is configured. | Count configured servers. | Exactly one workspace exists. |
| 2 | Enable Telephony. | Set telephony toggle on. | Telephony is enabled. |
| 3 | Open `test-links.html` in a browser. | Open local HTML file. | Link page is visible. |
| 4 | Click each valid `tel:` link. | Trigger each valid `tel:` URI. | Dialpad receives the normalized number. |
| 5 | Click each valid `callto:` link. | Trigger each valid `callto:` URI. | Dialpad receives the normalized number. |
| 6 | Return to Rocket.Chat after each click. | Observe app focus and workspace. | The only workspace is used; no server picker appears. |

## Evidence

- Record each link clicked and observed number.
- Screenshot the dialpad state for at least one `tel:` link and one `callto:`
  link.

## Failure Signals

- Browser opens an unrelated application.
- Server picker appears despite only one workspace.
- Query strings or formatting are included in the dialed number.
