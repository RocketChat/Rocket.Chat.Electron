# Tray Presence Status QA Pack (CORE-2525)

This folder contains manual and agent-readable QA flows for the tray presence
status feature. It covers the Windows/Linux system-tray icon showing a
presence dot (online/away/busy/offline), the tray context menu's presence
radio items and read-only custom status line, connection/logged-out/no-
workspace/unsupported-workspace states, active-workspace scoping, the
unread-badge regression, and the presence rate limiter.

macOS is deliberately out of scope for the dot indicator: macOS tray images
are template images and render as monochrome, so the color-coded presence
dot cannot show there. Do not run these flows on macOS.

The steps are intentionally visual and self-contained. They describe screen
region, icon shape, visible labels, and confirmation states because these
flows are meant for both QA engineers and future visual agents. Do not
replace those instructions with references to a separate navigation
document.

## Quick Start

1. Install or run a build from this branch on Windows or Linux.
2. Add at least two Rocket.Chat workspaces that support presence (a modern
   server where the account has a `status` field), and sign in to at least
   one of them far enough for the main window to load.
3. Keep the web client (or another Rocket.Chat client, e.g. a second browser
   session logged in as the same user) open side by side so status changes
   can be confirmed independently of the tray.
4. Follow the smoke order below, then run the remaining flows.
5. For Qase import, run
   `node qa/scripts/export-qase-csv.mjs qa/core-2525-tray-presence` and
   import the generated CSV with source type `Qase.io`.

## Smoke Order

| Order | Flow                                      | Required on    |
| ----- | ----------------------------------------- | -------------- |
| 1     | `flows/01-presence-icon-states.md`        | Windows, Linux |
| 2     | `flows/02-presence-menu-radios.md`        | Windows, Linux |
| 3     | `flows/03-custom-status-text.md`          | Windows, Linux |
| 4     | `flows/04-active-workspace-scoping.md`    | Windows, Linux |
| 5     | `flows/05-disconnected-state.md`          | Windows, Linux |
| 6     | `flows/06-logged-out-state.md`            | Windows, Linux |
| 7     | `flows/07-no-workspace-state.md`          | Windows, Linux |
| 8     | `flows/08-unsupported-workspace.md`       | Windows, Linux |
| 9     | `flows/09-unread-badge-regression.md`     | Windows, Linux |
| 10    | `flows/10-badge-and-presence-combined.md` | Windows, Linux |
| 11    | `flows/11-rate-limit-rapid-clicks.md`     | Windows, Linux |

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

Capture screenshots of the tray icon (ideally a zoomed crop of the
notification area / system tray) for icon-legibility failures, and screen
recordings or before/after screenshots of the second client for status-value
failures.

## Folder Map

| Path       | Purpose                                                           |
| ---------- | ----------------------------------------------------------------- |
| `flows/`   | Structured QA flows                                               |
| `exports/` | Generated Qase CSV exports                                        |
| `results/` | Optional local evidence area; do not commit run-specific evidence |

## Source Of UI Truth

When updating this pack, derive visible steps from the implementation:

- Tray menu items and enabled/checked/hidden logic:
  `src/ui/main/trayIcon.ts` (`buildMenuTemplate`, `buildPresenceMenuItems`).
- Tray icon file selection per platform/badge/presence: `src/ui/main/icons.ts`
  (`getTrayIconPath`).
- Presence circle colours (existing unread `Badge`, recolored):
  `src/ui/icons/presenceColors.ts`, `WindowsTrayIcon.tsx`, `LinuxTrayIcon.tsx`.
- Visible menu labels: `src/i18n/en.i18n.json` under `tray.presence.*`.
- Active-workspace presence selection: `src/ui/selectors.ts`
  (`selectActiveServerPresence`).
- Presence read/write and rate limiting inside the webview:
  `src/injected.ts` (`userPresenceStatus` setup block) and
  `src/servers/preload/presenceDebounce.ts`.
