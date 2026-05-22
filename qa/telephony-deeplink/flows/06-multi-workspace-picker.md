---
id: TEL-QA-006
title: Multi-workspace server picker
platforms: [windows, macos, linux]
priority: high
requires: [telephony_enabled, two_or_more_workspaces, test-links-html]
test_links: ["tel:+15551234567", "callto://+491234567890"]
expected_result: The server picker opens, routes to the chosen workspace, and supports cancel.
---

# Multi-Workspace Server Picker

## Steps

| Step | Human action | Agent action | Expected result |
| --- | --- | --- | --- |
| 1 | Configure at least two workspaces. | Ensure server list length is at least two. | Multiple workspace choices are available. |
| 2 | Click `tel:+15551234567`. | Trigger the link. | Server picker modal opens. |
| 3 | Review modal contents. | Read server rows. | Each workspace has readable title/host and selectable row. |
| 4 | Click a workspace without Remember checked. | Select a server with remember false. | Dialpad opens in selected workspace. |
| 5 | Click another link. | Trigger another phone link. | Picker opens again. |
| 6 | Close/cancel the modal. | Dismiss modal. | No call request is placed. |

## Evidence

- Screenshot of server picker.
- Note selected workspace and final dialpad workspace.

## Failure Signals

- Wrong workspace receives the call.
- Modal cannot be dismissed.
- Text is unreadable or clipped.
