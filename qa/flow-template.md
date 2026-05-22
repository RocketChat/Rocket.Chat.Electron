---
id: FEATURE-QA-001
title: Flow title
platforms: [windows, macos, linux]
priority: smoke
qase:
  suite: Feature area
  priority: high
  severity: major
  status: actual
  automation: manual
  qase_id: null
requires: [installed_branch_build]
test_links: []
expected_result: One-sentence pass condition.
---

# Flow Title

## Steps

| Step | Action | Test data | Expected result | Agent action |
| --- | --- | --- | --- | --- |
| 1 | Start from a clear, observable state and include the visually findable path to reach this feature, using labels/icons/regions verified from the implementation. | Required workspace, account, build, or link input. | State is ready for the next action. | Establish the same precondition using selectors, visible text, or app state. |
| 2 | Perform the user-visible action with screen region, relative position, icon shape, nearby UI, visible labels, menu item, tab, and section names taken from code/i18n. | Input values, URLs, protocol links, or toggles used in the step. | The expected UI or system behavior occurs. | Reproduce the same action with automation available to the agent. |
| 3 | Verify the result using visible UI state or a concrete artifact. | Observed state, command output, copied diagnostics, or captured evidence. | The flow's expected result is satisfied. | Inspect the relevant UI, file, command output, app state, or exported artifact. |

## Evidence

- Screenshot, copied diagnostics, command output, log path, or short note.

## Failure Signals

- Unexpected UI state.
- Missing or incorrect result.
- Crash, hang, or unrecoverable error.
