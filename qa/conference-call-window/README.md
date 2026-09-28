# Conference Call Window QA Pack

This folder contains manual and agent-readable QA flows for the conference
call window fix. It covers how Rocket.Chat Desktop opens `/conference/...`
call pages served by workspaces with the Pexip conference experience: from a
scheduled-meeting link opened in a browser, from a conference link clicked
inside a room, after a reload or restart, and when the app is closed.

Before the fix, those call pages loaded inside the workspace itself, replaced
the whole app with the meeting screen ("You left the meeting" / "Sie haben
das Meeting verlassen"), and stayed there after reloads and restarts. The
only way out was removing and re-adding the workspace.

The steps are intentionally visual and self-contained. They describe screen
region, visible labels, and confirmation states because these flows are meant
for both QA engineers and visual agents.

## Quick Start

1. Use a workspace whose server has the Pexip integration enabled and the
   "Pexip_Integration_SIP_AddAlias" setting on (required for scheduled
   meetings). Know at least one valid scheduled-meeting alias for it.
2. Install the Rocket.Chat Desktop build from this branch.
3. Add the workspace and sign in.
4. In the left vertical server list, click the three-dots/kebab button near
   the bottom edge below the server buttons, click `Settings`, click the
   `Voice & Video` tab near the top, and confirm `Video calls inside app` is
   switched on.
5. Open `qa/conference-call-window/test-links.html` in a browser, fill in the
   workspace host and meeting alias, and keep the page open.
6. Follow the smoke order below.
7. For Qase import, run
   `node qa/scripts/export-qase-csv.mjs qa/conference-call-window` and import
   the generated CSV with source type `Qase.io`.

## Smoke Order

| Order | Flow | Required on |
| --- | --- | --- |
| 1 | `flows/01-scheduled-link-opens-call-window.md` | All platforms |
| 2 | `flows/02-in-room-conference-link.md` | All platforms |
| 3 | `flows/03-reload-and-restart-stay-in-workspace.md` | All platforms |
| 4 | `flows/04-stuck-workspace-recovers.md` | Machines already stuck on an older build |
| 5 | `flows/05-link-cold-starts-app.md` | All platforms |
| 6 | `flows/06-video-calls-inside-app-off.md` | All platforms |

## Flow Result Format

Use this format in `results/` or in the ticket comment:

```text
Flow ID:
Platform:
Build:
Result: Pass | Fail | Blocked
Evidence:
Notes:
```

Capture the screenshots listed in each flow's `Evidence` section: flows that
open a separate call window need both the main window and the call window,
CONF-QA-004 needs the main window before and after updating, and CONF-QA-006
needs the browser tab and the main window. Attach the app log file for any
failure.

## Folder Map

| Path | Purpose |
| --- | --- |
| `test-links.html` | Local browser page that builds scheduled-meeting and conference links for a workspace |
| `flows/` | Structured QA flows |
| `exports/` | Generated Qase CSV exports |
| `results/` | Local run notes (not committed) |
