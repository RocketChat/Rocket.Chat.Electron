---
name: dev-app-verify
description: Drive and screenshot the running Rocket.Chat Desktop dev app (yarn start) through the main-process inspector on port 9339 — trigger menu items (Simulate Download/Update), evaluate in the renderer DOM, capture titlebar screenshots. Use whenever a UI change needs runtime/visual verification that component tests can't see (paint, clipping, colors, animation, layout).
---

Follow `skills/dev-app-verify/SKILL.md` (repo root) — the canonical,
agent-agnostic version of this runbook. It contains the ready-made inspector
script, menu-triggering and DOM-truth recipes, and the three pitfalls that
produce false alarms (window occlusion freezing `capturePage`, watcher
restarts killing in-flight state, singleton-lock wedges).

This stub exists so Claude Code auto-discovers the skill; keeping the body in
one place prevents the two copies from drifting.
