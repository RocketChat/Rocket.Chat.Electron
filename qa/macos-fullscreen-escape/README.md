# macOS Fullscreen Escape QA Pack

This folder contains manual and agent-readable QA flows for the macOS native
fullscreen behavior of the Escape key. It covers the case where the app window is
in native fullscreen and the Escape key must not drop the window out of
fullscreen, whether or not a video is playing in HTML5 fullscreen.

This behavior cannot be proven by the Jest suite. The bug lives in how macOS
AppKit reacts to a real key event coming from the operating system, and any test
generated key event is synthetic and never reaches AppKit. Automated tests only
protect the desktop-side wiring, so these flows are the coverage for the OS half
and must be run on real macOS hardware.

The flows are intentionally written for testers without implementation context.

## Quick Start

From the repo root:

```sh
node qa/scripts/validate-flows.mjs qa/macos-fullscreen-escape
node qa/scripts/export-qase-csv.mjs qa/macos-fullscreen-escape
```

## Smoke Order

1. Run `flows/01-video-fullscreen-escape.md`.
2. Run `flows/02-plain-escape-keeps-fullscreen.md`.
3. Run `flows/03-escape-and-shortcut-regressions.md`.
4. Run `flows/04-windows-linux-escape-unchanged.md` on Windows and Linux.

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

| Path       | Purpose                                                           |
| ---------- | ----------------------------------------------------------------- |
| `flows/`   | Structured QA flows                                               |
| `exports/` | Generated Qase CSV exports                                        |
| `results/` | Optional local evidence area; do not commit run-specific evidence |

## Source Of Truth

When updating this pack, derive expected behavior from:

- `src/ui/main/escapeFullscreenGuard.ts`
- `src/ui/main/escapeFullscreenGuard.main.spec.ts`
- `src/ui/main/serverView/index.ts` (`before-input-event` handling for guest views)
- `src/ui/main/rootWindow.ts` (`before-input-event` handling for the app chrome)
- `src/ui/main/menuBar.ts` (macOS `Full screen` item, `Control+Command+F`)
- `src/ui/components/TabBar/styles.tsx` (`TrafficLightSpacer` collapses in fullscreen)
