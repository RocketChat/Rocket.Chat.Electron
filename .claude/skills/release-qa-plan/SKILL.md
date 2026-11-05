---
name: release-qa-plan
description: Builds the stable-release QA plan for Rocket.Chat Desktop — collects every change between the last stable tag and dev, maps each to a QA flow, writes a Qase-ready qa/release-X.Y.Z/ pack for the installed prerelease build, and gives a go/no-go report. Use before a stable promotion. Triggered by "/release-qa-plan", "QA plan for the stable release", "what must we test before X.Y.0", "release regression plan", "can this alpha go stable".
---

Follow `skills/release-qa-plan/SKILL.md` (repo root) — the canonical,
agent-agnostic version of this runbook, next to its change collector
`skills/release-qa-plan/collect-changes.mjs`.

This stub exists so Claude Code auto-discovers the skill; keeping the body in
one place prevents the two copies from drifting.
