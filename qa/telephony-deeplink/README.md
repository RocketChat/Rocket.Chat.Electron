# Telephony Deeplink QA Pack

This folder contains manual and agent-readable QA flows for the telephony
deeplink branch. It covers `tel:` and `callto:` protocol handling, telephony
settings, diagnostics, workspace selection, default-app registration, and
installer policy behavior.

## Quick Start

1. Install or run a build from this branch.
2. Add at least one Rocket.Chat workspace and sign in far enough for the main
   window to load.
3. Open `qa/telephony-deeplink/test-links.html` in a browser.
4. Follow the smoke order below, then run the platform-specific flows.

## Smoke Order

| Order | Flow | Required on |
| --- | --- | --- |
| 1 | `flows/01-settings-discovery.md` | All platforms |
| 2 | `flows/02-enable-disable-gating.md` | All platforms |
| 3 | `flows/05-single-workspace-links.md` | All platforms |
| 4 | `flows/06-multi-workspace-picker.md` | All platforms with 2+ workspaces |
| 5 | `flows/04-diagnostics-panel.md` | All platforms |
| 6 | `flows/10-windows-default-apps.md` | Windows |
| 7 | `flows/09-macos-cold-launch.md` | macOS |
| 8 | `flows/12-linux-protocols.md` | Linux |

## Flow Result Format

Use this format in `results/` or in the release issue/PR comment:

```text
Flow ID:
Platform:
Build:
Result: Pass | Fail | Blocked
Evidence:
Notes:
```

Capture screenshots for UI failures, diagnostics JSON for protocol/default-app
failures, and install logs for MSI failures.

## Folder Map

| Path | Purpose |
| --- | --- |
| `test-links.html` | Local browser page with clickable `tel:` and `callto:` links |
| `flows/` | Structured QA flows |
| `scripts/` | Future helper scripts for OS-specific checks |
| `results/` | Optional local evidence area; do not commit run-specific evidence |

