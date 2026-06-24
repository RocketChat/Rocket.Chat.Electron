# Supported Versions QA Pack

This folder contains manual and agent-readable QA flows for Desktop supported
version checks. It covers startup/version-support behavior where the app decides
whether a server should be allowed, warned, or blocked.

The flows are intentionally written for testers without implementation context.
When a live environment is unavailable, the flow must say which targeted test or
code-path proof was used and mark runtime validation as blocked or not run.

## Quick Start

From the repo root:

```sh
node qa/scripts/validate-flows.mjs qa/supported-versions
node qa/scripts/export-qase-csv.mjs qa/supported-versions
```

## Smoke Order

1. Run `flows/01-sha-prefixed-exception.md`.

## Flow Result Format

```text
Flow ID:
Platform:
Build:
Review range:
Coverage: Full requested range | Partial surface review
Result: Pass | Fail | Blocked
Finding status: confirmed | suspected | blocked | none
Evidence:
Notes:
```

## Folder Map

| Path | Purpose |
| --- | --- |
| `flows/` | Structured QA flows |
| `exports/` | Generated Qase CSV exports |
| `results/` | Optional local evidence area; do not commit run-specific evidence |

## Source Of Truth

When updating this pack, derive expected behavior from:

- `src/servers/supportedVersions/main.ts`
- `src/servers/supportedVersions/main.main.spec.ts`
- `docs/supported-versions-flow.md`
