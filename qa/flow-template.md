---
id: FEATURE-QA-001
title: Flow title
platforms: [windows, macos, linux]
priority: smoke
requires: [installed_branch_build]
test_links: []
expected_result: One-sentence pass condition.
---

# Flow Title

## Steps

| Step | Human action | Agent action | Expected result |
| --- | --- | --- | --- |
| 1 | Start from a clear, observable state. | Establish the same precondition. | State is ready for the next action. |
| 2 | Perform the user-visible action. | Reproduce the same action with available automation. | The expected UI or system behavior occurs. |
| 3 | Verify the result. | Inspect the relevant UI, file, command output, or app state. | The flow's expected result is satisfied. |

## Evidence

- Screenshot, copied diagnostics, command output, log path, or short note.

## Failure Signals

- Unexpected UI state.
- Missing or incorrect result.
- Crash, hang, or unrecoverable error.

