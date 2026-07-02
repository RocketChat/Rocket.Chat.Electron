---
id: TEL-QA-006
title: Multi-workspace server picker
platforms: [windows, macos, linux]
priority: high
qase:
  suite: Telephony deeplinks
  priority: high
  severity: major
  status: actual
  automation: manual
  qase_id: null
requires: [telephony_enabled, two_or_more_workspaces, test-links-html]
test_links: ["tel:+15551234567", "callto://+491234567890"]
expected_result: The server picker opens, routes to the chosen workspace, and supports cancel.
---

# Multi-Workspace Server Picker

## Review Basis

- Comparison range: `master` to `feat/telephony-deeplink`.
- Changed surface: Multi-workspace picker shown after phone-link activation.
- User-visible risk: The app selects the wrong workspace, hides available
  workspaces, or leaves the tester without a way to choose where the call goes.
- Hypothesis: With multiple workspaces, enabled Telephony presents a visually
  findable picker and routes the call to the selected workspace.
- Smallest useful proof: Local UI repro with two or more configured workspaces.

## Steps

| Step | Action | Test data | Expected result | Agent action |
| --- | --- | --- | --- | --- |
| 1 | Configure at least two workspaces. |  | Multiple workspace choices are available. | Ensure server list length is at least two. |
| 2 | Click `tel:+15551234567`. |  | Server picker modal opens. | Trigger the link. |
| 3 | Review modal contents. |  | Each workspace has readable title/host and selectable row. | Read server rows. |
| 4 | Click a workspace without Remember checked. |  | Dialpad opens in selected workspace. | Select a server with remember false. |
| 5 | Click another link. |  | Picker opens again. | Trigger another phone link. |
| 6 | Close/cancel the modal. |  | No call request is placed. | Dismiss modal. |

## Evidence

- Screenshot of server picker.
- Note selected workspace and final dialpad workspace.

## Failure Signals

- Wrong workspace receives the call.
- Modal cannot be dismissed.
- Text is unreadable or clipped.
