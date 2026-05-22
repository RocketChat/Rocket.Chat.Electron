# QA Packs

This folder contains structured QA packs for feature branches and release
checks. A QA pack is more than documentation: it can include manual flows,
static click targets, helper scripts, and result-capture guidance.

Use `qa/<feature-slug>/` for each feature or release area. Keep the slug short,
lowercase, and specific, for example `qa/telephony-deeplink/`.

## Pack Structure

| Path | Required | Purpose |
| --- | --- | --- |
| `README.md` | Yes | Entry point, prerequisites, smoke order, result format |
| `flows/` | Yes | One Markdown file per scenario |
| `test-links.html` | When useful | Static browser page for protocol/deep-link/manual click targets |
| `scripts/` | Optional | Small helper scripts for repeatable environment checks |
| `results/` | Optional | Local evidence notes; do not commit run-specific artifacts by default |

## Flow Files

Name flows with a numeric order and short slug:

```text
flows/01-settings-discovery.md
flows/02-enable-disable-gating.md
flows/10-windows-default-apps.md
```

Each flow must be readable by a tester who knows nothing about the feature and
structured enough for an agent to reproduce. Use YAML frontmatter followed by
standard sections.

Before writing steps, inspect the feature implementation. The flow should be
derived from the UI that will actually appear, not from memory or product
intuition. Check the changed components, i18n strings, menu definitions, modal
buttons, icons, platform branches, tests, and any helper pages. If the UI is not
clear from code, stop and inspect more context before writing the flow.

Required frontmatter keys:

```yaml
---
id: FEATURE-QA-001
title: Human-readable title
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
```

Required body sections:

- `# <Title>`
- `## Steps` with a table containing `Step`, `Action`, `Test data`,
  `Expected result`, and `Agent action`
- `## Evidence`
- `## Failure Signals`

Use `priority: smoke` for the shortest release gate, `priority: release` for
platform-critical coverage, and `priority: high` or `medium` for broader
regression coverage.

Keep Qase fields under the `qase` block. `qase.priority`, `qase.severity`,
`qase.status`, and `qase.automation` must use slugs configured in the target
Qase workspace. Leave `qase.qase_id` empty until a case already exists in Qase;
Qase owns generated case IDs, while the repo owns `FEATURE-QA-###` source IDs.

The steps table maps directly to Qase classic steps:

- `Action` -> `steps_actions`
- `Test data` and `Agent action` -> `steps_data`
- `Expected result` -> `steps_results`

For new UI, do not assume QA knows the app. The step itself must explain how to
reach the feature from visible UI. Write steps as if a visual agent will execute
them from a screenshot. Include the screen region, relative position, icon
shape, nearby UI, visible label after the click, and visual confirmation that
the tester is in the right place.

Do not use hidden labels as the primary instruction. If a menu title or tooltip
only appears after hover/click, first describe the visible anchor that lets the
tester find it.

Example:

```text
In the left vertical server list, click the three-dots/kebab button near the
bottom edge, below the server buttons. In the menu that opens, click Settings.
On the Settings page, click the Voice & Video tab near the top, then scroll or
scan for the Telephony section heading.
```

Bad examples:

```text
Open Settings.
Open Telephony settings.
Use a separate navigation file to enable Telephony.
Click a tooltip-only menu title without describing the visible icon.
```

## Test Link Pages

Add a static HTML file when QA needs clickable browser actions, protocol links,
deep links, downloads, or copyable sample data. The HTML must work from disk
without a dev server and should label every link with its purpose and expected
result.

## Helper Scripts

Scripts should be small, deterministic, and safe by default. Prefer read-only
checks. If a script changes OS or app state, the flow must explicitly say so and
describe how to undo or verify the change.

Common scripts:

- `node qa/scripts/validate-flows.mjs qa/<pack>` validates the local source
  format before review or export.
- `node qa/scripts/export-qase-csv.mjs qa/<pack>` writes
  `qa/<pack>/exports/qase-import.csv` for Qase source type `Qase.io`.

## Results

Use this result format in a pack's `results/` folder, a release issue, or a PR
comment:

```text
Flow ID:
Platform:
Build:
Result: Pass | Fail | Blocked
Evidence:
Notes:
```

Do not commit screenshots, logs, diagnostics JSON, or machine-specific results
unless a release owner explicitly asks for them.

## Current Packs

- `qa/telephony-deeplink/` covers telephony `tel:` / `callto:` links, settings,
  diagnostics, workspace selection, default handlers, and installer policy.
