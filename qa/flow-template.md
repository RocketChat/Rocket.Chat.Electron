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

## Review Basis

- Comparison range: Base branch and head branch or commit used to derive this
  branch-specific flow, or `not branch-derived`.
- Changed surface: Code, UI, platform, script, installer, or integration surface
  that this flow covers.
- User-visible risk: What a customer could notice, hit, or be blocked by.
- Hypothesis: Falsifiable statement that this flow proves or disproves.
- Smallest useful proof: Existing test, targeted test, local UI repro, OS-level
  repro, or code-path proof that justifies this manual flow.

## Steps

| Step | Action                                                                                                                                                                 | Test data                                                                 | Expected result                            | Agent action                                                                    |
| ---- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------- | ------------------------------------------ | ------------------------------------------------------------------------------- |
| 1    | Start from a clear, observable state. Include the visually findable path to this feature. Use labels, icons, and regions that you checked in the implementation.       | Required workspace, account, build, or link input.                        | State is ready for the next action.        | Set the same precondition with selectors, visible text, or app state.           |
| 2    | Do the user-visible action. Include the screen region, relative position, icon shape, nearby UI, visible labels, menu item, tab, and section names from code and i18n. | Input values, URLs, protocol links, or toggles used in the step.          | The expected UI or system behavior occurs. | Do the same action with the automation that the agent has.                      |
| 3    | Check the result in the visible UI state or in a concrete artifact.                                                                                                    | Observed state, command output, copied diagnostics, or captured evidence. | The flow's expected result is satisfied.   | Inspect the relevant UI, file, command output, app state, or exported artifact. |

## Evidence

- Screenshot, copied diagnostics, command output, log path, or short note.

## Failure Signals

- Unexpected UI state.
- Missing or incorrect result.
- Crash, hang, or unrecoverable error.
