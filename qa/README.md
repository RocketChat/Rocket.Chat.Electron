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

Required frontmatter keys:

```yaml
---
id: FEATURE-QA-001
title: Human-readable title
platforms: [windows, macos, linux]
priority: smoke
requires: [installed_branch_build]
test_links: []
expected_result: One-sentence pass condition.
---
```

Required body sections:

- `# <Title>`
- `## Steps` with a table containing `Step`, `Human action`, `Agent action`,
  and `Expected result`
- `## Evidence`
- `## Failure Signals`

Use `priority: smoke` for the shortest release gate, `priority: release` for
platform-critical coverage, and `priority: high` or `medium` for broader
regression coverage.

## Test Link Pages

Add a static HTML file when QA needs clickable browser actions, protocol links,
deep links, downloads, or copyable sample data. The HTML must work from disk
without a dev server and should label every link with its purpose and expected
result.

## Helper Scripts

Scripts should be small, deterministic, and safe by default. Prefer read-only
checks. If a script changes OS or app state, the flow must explicitly say so and
describe how to undo or verify the change.

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

