---
name: web-signals-probe
description: Checks that a Rocket.Chat server's web client still fires the window events that the desktop app reads. It probes the Meteor build and the Vite build, in the page world and in an isolated world like a preload. Use it before you change desktop code that reads these events. Use it when a core release or the Vite client can change them. Use it when the badge, the logged-in state, the boot signal or the tray status fails on a new server. Triggers include "probe web signals", "check the web client events", "did core break the desktop signals", "test the Vite client with the desktop".
---

Follow `skills/web-signals-probe/SKILL.md` (repo root). It is the canonical
runbook, and it works with any agent. It holds the contract table, the
procedure (disposable server, `yarn probe:web-signals`, report), the failure
table and the limits.

This stub exists so Claude Code auto-discovers the skill. One body in one
place prevents the two copies from drifting.
