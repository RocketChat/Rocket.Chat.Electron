---
name: electron-bump
description: Upgrade the Electron version in Rocket.Chat.Electron safely. Detects breaking changes between the current and target Electron release, produces a migration plan gated on user approval, applies the fixes (using GitNexus impact analysis to find every affected callsite), bumps coupled config (electron-builder bundle id, CI node-version, @types/node), runs lint + tests, and opens a ready PR from a fresh branch off dev. Trigger when the user says "bump electron", "upgrade electron", "update electron to X", "/electron-bump", or asks to move to a newer Electron release.
---

# Electron Version Bump

Automates a safe Electron upgrade for **this repo** (Rocket.Chat.Electron). Plan-gated: research → plan → **STOP for approval** → apply → PR.

## Invocation

```text
/electron-bump [version]
```

- `version` given (e.g. `41.2.0`) → target that exact release.
- `version` omitted → resolve **latest stable** from npm (`npm view electron version`), confirm it with the user before proceeding.
- Never silently skip across multiple majors. If target is 2+ majors ahead of current, warn and ask whether to step through intermediate majors one at a time.

## Hard rules

- Branch from **dev**, never edit dev directly. Use a worktree (see CLAUDE.md § Worktrees) so the user's working dir is untouched.
- Plan-gated: do NOT apply any code/config edit until the user approves the migration plan.
- This is an Orchestrator task: delegate research to `researcher`, edits to `builder-*`, test runs to `watcher`/`tester`. Don't solo the implementation.
- Never commit/push without explicit user permission for the commit step (PR creation is the approved end-state of this skill, but confirm before `git push` if not already authorized this session).
- GitNexus is authoritative for "what calls this Electron API". Query it before grepping.

---

## Phase 0 — Resolve versions & freshness

1. Read current versions:
   - `node -p "require('./package.json').devDependencies.electron"` → CURRENT.
   - `node -p "require('./package.json').devDependencies['electron-builder']"` → builder version.
2. Resolve TARGET (arg or `npm view electron version`).
3. **Downgrade guard**: compare TARGET vs CURRENT semver. If TARGET < CURRENT, STOP and ask for explicit confirmation that a downgrade is intended before proceeding.
4. Classify the jump: **patch** (z), **minor** (y), or **major** (x). This drives effort:
   - **patch / minor within same major** → historically package.json + yarn.lock only, no code changes. Light path.
   - **major** → expect API breaks, code adaptation, @types/node bump, README/builder updates. Full path.
5. Ensure GitNexus index is fresh: if any GitNexus tool warns stale, run `npx gitnexus analyze --skip-agents-md` in background and continue.

---

## Phase 1 — Detect breaking changes (research, parallel)

Dispatch a `researcher` to gather the authoritative breaking-changes list, and a `finder` to confirm the current coupled surface (it may have drifted since this skill was written).

**Researcher brief** — fetch and distill, for the range CURRENT → TARGET:
- Electron breaking-changes doc: `https://www.electronjs.org/docs/latest/breaking-changes` (covers planned + past removals). Also each major's release blog `https://www.electronjs.org/blog/electron-<major>-0`.
- The bundled **Node.js** and **Chromium** versions for the target release (from `https://releases.electronjs.org/` or the release blog). Node major bump → may need `@types/node` bump + `node-version` in CI.
- Return a flat list: every breaking/deprecated/removed API in range, each tagged `removed | behavior-change | deprecated`, with the Electron version it landed in.

**Finder brief** — re-confirm the coupled surface in the repo (do not trust this doc blindly; verify):
- Electron version declarations, electron-builder config, CI `node-version` pins.
- Direct `from 'electron'` imports and which modules dominate.
- Presence of Electron-coupled patches in `.yarn/patches/` or `patches/`.
- Any native deps needing rebuild (node-gyp/prebuild).

### Coupled-surface hint map (WHERE to look — never trust any value here as current)

This lists the *kinds of places* coupled to the Electron version, so the finder knows where to look. It is a hint map, not a source of truth: every concrete value (version numbers, bundle ids, pinned Node) MUST come from the finder reading the repo live this run, never from this table. Treat anything specific below as "last seen" only.

| What | Where | Notes |
|------|-------|-------|
| Electron version | `package.json` → `devDependencies.electron` | primary |
| electron-builder | `package.json` → `devDependencies.electron-builder` | must stay compatible with target Electron major |
| Builder config | `electron-builder.json` | inspect live. A `mac.bundleVersion` (and similar build ids) exists here but is an APP build id, NOT Electron-coupled — do not bump it for an Electron upgrade unless packaging actually requires it. |
| CI Node pin | `.github/workflows/build-release.yml`, `pull-request-build.yml`, `validate-pr.yml` | `node-version:` key; bump if target's bundled Node major changes |
| @types/node | `package.json` | bump to match bundled Node major on major Electron bumps |
| Runtime version read | `src/ui/main/serverView/index.ts` (`process.versions.electron`) | sanity-check still valid |
| Cert docs | `docs/corporate-certificate-configuration.md` | references Node TLS API availability per Electron version |

**Patches**: none Electron-coupled as of E40 (`@ewsjs/xhr` and `@kayahr/jest-electron-runner` are unrelated — see CLAUDE.md). **Native deps**: none (pure JS/TS, no ABI risk). Re-verify both via the finder.

### High-risk API zones (churn often here)

GitNexus-query each before assuming safe. Known hot callsites as of E40:

| API | Risk | Known callsites |
|-----|------|-----------------|
| `session.setPermissionRequestHandler` | HIGH | `src/ui/main/serverView/index.ts`, `src/videoCallWindow/ipc.ts` |
| `desktopCapturer.getSources` | MEDIUM | `src/screenSharing/*` |
| `contextBridge` | MEDIUM | `src/preload.ts`, `src/videoCallWindow/preload/index.ts` |
| `screen` / display | MEDIUM | `src/logViewerWindow/ipc.ts`, `src/videoCallWindow/ipc.ts` |

Not currently used as of E40 (`webContents.printToPDF`, `remote` module, `BrowserView`/`WebContentsView`) — treat as a hint, not an exclusion list: if the researcher reports one of these as breaking for this range, verify via GitNexus rather than skipping it outright.

---

## Phase 2 — Map breaking changes to THIS codebase via GitNexus

For each breaking/removed/changed API the researcher returned, find whether and where the repo uses it. **Use GitNexus, not raw grep** (CLAUDE.md mandate):

1. `mcp__gitnexus__query({ query: "<api or concept>", repo: "Rocket.Chat.Electron" })` to find execution flows touching it.
2. For each concrete symbol/callsite, `mcp__gitnexus__context({ name: "<symbol>", repo: "Rocket.Chat.Electron" })` for the 360° view.
3. `mcp__gitnexus__impact({ target: "<symbol>", direction: "upstream", repo: "Rocket.Chat.Electron" })` to get the blast radius before editing. **Report HIGH/CRITICAL risk to the user.**

Produce, per breaking change, one of:
- **Not used** — no action.
- **Used, mechanical fix** — exact files + line-level change.
- **Used, needs judgment** — flag for the plan, describe the decision.

---

## Phase 3 — Write the migration plan & STOP

Write the plan to a **dedicated, non-colliding** file: `.localdev/workflow/electron-bump-<TARGET-major>.md` (e.g. `electron-bump-42.md`). Do NOT write to `.localdev/workflow/todo.md` — it may already hold an unrelated active plan, and clobbering it loses live work. If the dedicated file already exists from a prior attempt, overwrite that one (it's yours). Present a summary to the user. The plan MUST contain:

- Version delta: CURRENT → TARGET, bundled Node/Chromium delta, jump class.
- Breaking changes **that affect this repo**, each with: affected files, GitNexus blast radius, proposed fix, risk.
- Coupled config edits required (builder bundle id, CI node-version, @types/node) — only the ones actually needed for this delta.
- Test/verification plan (lint, `*.spec.ts` renderer, `*.main.spec.ts` main, cross-platform note).
- Anything ambiguous → list as an open question.

**STOP. Do not proceed to Phase 4 until the user approves.** If the plan has open questions, ask them now.

---

## Phase 4 — Branch & apply (after approval)

1. Create worktree off dev:
   ```bash
   mkdir -p ../Rocket.Chat.Electron-worktrees
   git worktree add ../Rocket.Chat.Electron-worktrees/electron-<TARGET> -b chore/electron-<TARGET> dev
   ```
   Work in that worktree for the rest of the skill.
2. Bump the version:
   - `package.json` → `devDependencies.electron` = TARGET (and `electron-builder` if the plan calls for it).
   - `@types/node` if Node major changed.
   - `yarn install` to regenerate `yarn.lock` (dispatch `watcher` — install is noisy).
3. Apply coupled config edits from the plan (builder bundle id, CI `node-version`).
4. Apply code fixes:
   - Dispatch `builder-fast` for single scoped edits, `builder-smart` for non-trivial API adaptations, `builder-trivial` only for the same edit across 5+ sites.
   - Serialize builders by file. Run `mcp__gitnexus__impact` for each edit before applying it — don't assess blast radius mentally.
5. Update docs only if the plan flagged them (README version table, cert doc).

---

## Phase 5 — Verify

Dispatch `watcher`/`tester` (keep noisy output out of orchestrator context):

1. `yarn lint` — ESLint + TS typecheck (`npx tsc --noEmit` if needed).
2. `yarn test` — full Jest suite (renderer + main). Note: RTL specs need fake timers (see project memory `lesson_rtl_jest_electron_timer_leak`); a leaked timer orphans electron procs. Don't loop per-builder full runs — batch-verify once.
3. If a local build is cheap enough, smoke `yarn build`. Full packaging (electron-builder, Windows signing) is CI's job — do NOT attempt local Windows/MSI builds.
4. Any failure → diagnose root cause, fix, re-verify. Do not mark done with red tests.

Definition of Done: version bumped everywhere the plan listed, lint green, tests green, no orphaned Electron API usage left from the breaking-changes list.

---

## Phase 6 — Commit & PR

1. Run `mcp__gitnexus__detect_changes()` to confirm only the expected symbols/flows changed (CLAUDE.md mandate).
2. Show the user the diff summary, confirm the commit.
3. Commit with conventional message: `chore: update Electron from <CURRENT> to <TARGET>` — match the repo's historical style (see PRs #3285, #3179; the PR number isn't known at commit time, and squash-merge titles carry it anyway). Body lists breaking-change adaptations for a major bump; minimal for patch/minor.
4. Push the branch.
5. Open a **ready (non-draft)** PR: `gh pr create --base dev --label build-artifacts`. Base is **dev** (repo default). Apply the `build-artifacts` label here because an Electron bump changes packaging and reviewers must smoke-test the built installers — this is exactly the case the label is for. PR body:
   - What changed: version delta, bundled Node/Chromium.
   - Breaking changes addressed (bullet list, frame as adaptation not regression).
   - Verification: lint + tests pass; CI will run cross-platform builds.
6. After the PR is open, suggest `npx gitnexus analyze --skip-agents-md` (background) to refresh the index for the changed code.

---

## Effort shortcut

- **Patch/minor within same major**: Phases 1–2 usually find nothing in-repo. Plan is short ("no code changes, bump + lockfile"), still gated. Phases 4–6 are package.json + yarn.lock + verify + PR. Match PR #3285's minimal shape.
- **Major**: full path, expect code adaptation + @types/node + builder bundle + README, like PR #3179.
