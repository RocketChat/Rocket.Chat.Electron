---
name: dev-app-verify
description: Drive and screenshot the running Rocket.Chat Desktop dev app (yarn start) through the main-process inspector on port 9339. Trigger menu items (Simulate Download/Update), evaluate in the renderer DOM, and capture titlebar screenshots. Use whenever a UI change needs runtime or visual verification that component tests cannot see (paint, clipping, colors, animation, layout).
---

Follow `skills/dev-app-verify/SKILL.md` (repo root). It is the canonical
runbook, and it works with any agent. It contains the ready-made inspector
script and the menu-triggering and DOM-truth recipes. It also lists the four
pitfalls that produce false alarms:

- Watcher restarts kill in-flight state.
- Window occlusion freezes `capturePage`.
- A singleton-lock race makes the inspector port refuse connections.
- A background `gitnexus analyze` restarts the app and drops staged files.

This stub exists so Claude Code auto-discovers the skill. One body in one
place prevents the two copies from drifting.
