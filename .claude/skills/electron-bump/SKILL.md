---
name: electron-bump
description: Upgrade the Electron version in Rocket.Chat.Electron safely. Detect the breaking changes between the current and target Electron release. Produce a migration plan and wait for user approval. Then apply the fixes (use GitNexus impact analysis to find every affected callsite). Bump the coupled config (electron-builder bundle id, CI node-version, @types/node). Run lint and tests. Open a ready PR from a fresh branch off dev. Trigger when the user says "bump electron", "upgrade electron", "update electron to X", "/electron-bump", or asks to move to a newer Electron release.
---

# Electron Version Bump

This skill automates a safe Electron upgrade for **this repo**
(Rocket.Chat.Electron). The skill gates on the plan: research → plan →
**STOP for approval** → apply → PR.

## Invocation

```text
/electron-bump [version]
```

- `version` given (e.g. `41.2.0`) → target that exact release.
- `version` omitted → resolve the **latest stable** from npm
  (`npm view electron version`). Ask the user to approve it before you proceed.
- NEVER skip across multiple majors silently. If the target is 2+ majors
  ahead of the current version, warn the user. Ask whether to step through
  the intermediate majors one at a time.

## Hard rules

- Branch from **dev**. NEVER edit dev directly. Use a worktree (see
  `AGENTS.md`, "Worktrees"), so that the user's working directory stays
  untouched.
- Do NOT apply any code or config edit until the user approves the migration
  plan.
- This is an Orchestrator task. Delegate research to `researcher`, edits to
  `builder-*`, and test runs to `watcher`/`tester`. Do not do the
  implementation yourself.
- NEVER commit or push without explicit user permission for the commit step.
  PR creation is the approved end-state of this skill. Still ask before
  `git push` if the session has not authorized it yet.
- GitNexus is authoritative for "what calls this Electron API". Query it
  before you grep.

---

## Phase 0 — Resolve versions & freshness

1. Read the current versions:
   - `node -p "require('./package.json').devDependencies.electron"` → CURRENT.
   - `node -p "require('./package.json').devDependencies['electron-builder']"` → builder version.
2. Resolve TARGET (argument or `npm view electron version`).
3. **Downgrade guard**: compare TARGET with CURRENT by semver. If TARGET <
   CURRENT, STOP. Ask the user to state explicitly that a downgrade is
   intended before you proceed.
4. Classify the jump as **patch** (z), **minor** (y), or **major** (x). The
   class drives the effort:
   - **patch / minor within the same major** → historically `package.json`
     and `yarn.lock` only, no code changes. Light path.
   - **major** → expect API breaks, code adaptation, an @types/node bump, and
     README/builder updates. Full path.
5. Make sure that the GitNexus index is fresh. If a GitNexus tool warns that
   the index is stale, run `node .gitnexus/run.cjs analyze --index-only`
   (see `AGENTS.md`). Run it only at a quiet point: a
   background analyze can drop staged files and restart a running
   `yarn start` app.

---

## Phase 1 — Detect breaking changes (research, parallel)

Dispatch a `researcher` to gather the authoritative list of breaking
changes. Dispatch a `finder` to re-check the current coupled surface. That
surface may have drifted since this skill was written.

**Researcher brief** — fetch and distill, for the range CURRENT → TARGET:

- The Electron breaking-changes doc:
  `https://www.electronjs.org/docs/latest/breaking-changes` (it covers
  planned and past removals). Also read the release blog of each major:
  `https://www.electronjs.org/blog/electron-<major>-0`.
- The bundled **Node.js** and **Chromium** versions for the target release
  (from `https://releases.electronjs.org/` or the release blog). A Node major
  bump may need an `@types/node` bump and a `node-version` bump in CI.
- Return a flat list. List every breaking, deprecated, or removed API in the
  range. Tag each one `removed | behavior-change | deprecated`, with the
  Electron version where it landed.

**Finder brief** — re-check the coupled surface in the repo. Do not trust
this doc blindly. Inspect these items:

- Electron version declarations, the electron-builder config, and the CI
  `node-version` pins.
- Direct `from 'electron'` imports and the modules that dominate them.
- Electron-coupled patches in `.yarn/patches/` or `patches/`.
- Native deps that need a rebuild (node-gyp/prebuild).

### Coupled-surface hint map (WHERE to look — never trust any value here as current)

This table lists the _kinds of places_ that couple to the Electron version.
The finder uses it to know where to look. It is a hint map and not a source
of truth. Every concrete value (version numbers, bundle ids, pinned Node) MUST
come from the finder. The finder reads the repo live in this run. A value
NEVER comes from this table. Treat anything specific below as "last seen" only.

| What                 | Where                                                                              | Notes                                                                                                                                                                                               |
| -------------------- | ---------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Electron version     | `package.json` → `devDependencies.electron`                                        | primary                                                                                                                                                                                             |
| electron-builder     | `package.json` → `devDependencies.electron-builder`                                | must stay compatible with target Electron major                                                                                                                                                     |
| Builder config       | `electron-builder.json`                                                            | inspect live. A `mac.bundleVersion` (and similar build ids) exists here but is an APP build id, NOT Electron-coupled. Do not bump it for an Electron upgrade unless packaging actually requires it. |
| CI Node pin          | `.github/workflows/build-release.yml`, `pull-request-build.yml`, `validate-pr.yml` | `node-version:` key. Bump it if the target's bundled Node major changes                                                                                                                             |
| @types/node          | `package.json`                                                                     | bump to match the bundled Node major on major Electron bumps                                                                                                                                        |
| Runtime version read | `src/ui/main/serverView/index.ts` (`process.versions.electron`)                    | check that it is still valid                                                                                                                                                                        |
| Cert docs            | `docs/corporate-certificate-configuration.md`                                      | references Node TLS API availability per Electron version                                                                                                                                           |

**Patches**: none is Electron-coupled as of E40. `@ewsjs/xhr` and
`@kayahr/jest-electron-runner` are unrelated (see `AGENTS.md`, "Patches And
Builds"). `.yarn/patches/` also holds an `app-builder-lib` patch for
electron-builder 26.0.3. Check it when the plan bumps electron-builder.
**Native deps**: none (pure JS/TS, no ABI risk). Re-check both with the
finder.

### High-risk API zones (churn often here)

Query each one with GitNexus before you assume it is safe. Known hot
callsites as of E40:

| API                                   | Risk   | Known callsites                                                 |
| ------------------------------------- | ------ | --------------------------------------------------------------- |
| `session.setPermissionRequestHandler` | HIGH   | `src/ui/main/serverView/index.ts`, `src/videoCallWindow/ipc.ts` |
| `desktopCapturer.getSources`          | MEDIUM | `src/screenSharing/*`, `src/jitsi/ipc.ts`                       |
| `contextBridge`                       | MEDIUM | `src/preload.ts`, `src/videoCallWindow/preload/index.ts`        |
| `screen` / display                    | MEDIUM | `src/logViewerWindow/ipc.ts`, `src/videoCallWindow/ipc.ts`      |

As of E40, the repo does not use `webContents.printToPDF`, the `remote`
module, or `BrowserView`/`WebContentsView`. Treat this as a hint and not as
an exclusion list. If the researcher reports one of them as breaking for
this range, check it with GitNexus. Do not skip it.

---

## Phase 2 — Map breaking changes to THIS codebase via GitNexus

For each breaking, removed, or changed API that the researcher returned,
find whether and where the repo uses it. **Use GitNexus and not raw grep**
(`AGENTS.md`, "GitNexus" rules):

1. `mcp__gitnexus__query({ query: "<api or concept>", repo: "Rocket.Chat.Electron" })` to find the execution flows that touch it.
2. For each concrete symbol or callsite, run `mcp__gitnexus__context({ name: "<symbol>", repo: "Rocket.Chat.Electron" })` for the 360° view.
3. Run `mcp__gitnexus__impact({ target: "<symbol>", direction: "upstream", repo: "Rocket.Chat.Electron" })` to see the blast radius before you edit. **Report HIGH/CRITICAL risk to the user.**

Produce one of these results for each breaking change:

- **Not used** — no action.
- **Used, mechanical fix** — exact files and the line-level change.
- **Used, needs judgment** — flag it for the plan and describe the decision.

---

## Phase 3 — Write the migration plan & STOP

Write the plan to a **dedicated, non-colliding** file:
`.localdev/workflow/electron-bump-<TARGET-major>.md` (e.g.
`electron-bump-42.md`). Do NOT write to `.localdev/workflow/todo.md`. It may
already hold an unrelated active plan, and an overwrite loses live work. If
the dedicated file already exists from a prior attempt, overwrite that file
(it is yours). Present a summary to the user. The plan MUST contain:

- The version delta: CURRENT → TARGET, the bundled Node/Chromium delta, and
  the jump class.
- The breaking changes **that affect this repo**. For each one: the affected
  files, the GitNexus blast radius, the proposed fix, and the risk.
- The coupled config edits that the plan requires (builder bundle id, CI
  node-version, @types/node). List only the ones that this delta needs.
- The test plan (lint, `*.spec.ts` renderer, `*.main.spec.ts` main, a
  cross-platform note).
- Each ambiguous item, as an open question.

**STOP. Do not proceed to Phase 4 until the user approves.** If the plan has
open questions, ask them now.

---

## Phase 4 — Branch & apply (after approval)

1. Fetch `origin dev` and create a worktree off `origin/dev`:
   ```bash
   mkdir -p ../Rocket.Chat.Electron-worktrees
   git worktree add ../Rocket.Chat.Electron-worktrees/electron-<TARGET> -b chore/electron-<TARGET> origin/dev
   ```
   Work in that worktree for the rest of the skill.
2. Bump the version:
   - `package.json` → `devDependencies.electron` = TARGET (and `electron-builder` if the plan calls for it).
   - `@types/node` if the Node major changed.
   - `yarn install` to regenerate `yarn.lock` (dispatch `watcher`, because install is noisy).
3. Apply the coupled config edits from the plan (builder bundle id, CI `node-version`).
4. Apply the code fixes:
   - Dispatch `builder-fast` for single scoped edits. Dispatch `builder-smart` for non-trivial API adaptations. Dispatch `builder-trivial` only for the same edit across 5+ sites.
   - Serialize the builders by file. Run `mcp__gitnexus__impact` for each edit before you apply it. Do not estimate the blast radius mentally.
5. Update docs only if the plan flagged them (README version table, cert doc).

---

## Phase 5 — Check

Dispatch `watcher`/`tester`, to keep noisy output out of the orchestrator
context:

1. `yarn lint` — ESLint and the TS typecheck (`npx tsc --noEmit` if needed).
2. `yarn test` — the full Jest suite (renderer and main). RTL specs need fake
   timers (see project memory `lesson_rtl_jest_electron_timer_leak`). A
   leaked timer orphans electron procs. Do not loop full runs per builder.
   Batch-check once.
3. If a local build is cheap enough, smoke-test `yarn build`. CI does full
   packaging (electron-builder, Windows signing). Do NOT attempt local
   Windows/MSI builds.
4. On any failure, diagnose the root cause, fix it, and check again. Do not
   mark the task done with red tests.

Definition of Done: the version is bumped everywhere that the plan listed.
Lint is green and tests are green. No orphaned usage of an API from the
breaking-changes list remains.

---

## Phase 6 — Commit & PR

1. Run `mcp__gitnexus__detect_changes()` to check that only the expected
   symbols and flows changed (`AGENTS.md`, "GitNexus" rules).
2. Present the diff summary to the user. Ask the user to approve the commit.
3. Commit with a conventional message:
   `chore: update Electron from <CURRENT> to <TARGET>`. Match the repo's
   historical style (see PRs #3285, #3179). The PR number is not known at
   commit time, and squash-merge titles carry it anyway. For a major bump,
   the body lists the breaking-change adaptations. For patch and minor, keep
   the body minimal.
4. Push the branch.
5. Open a **ready (non-draft)** PR: `gh pr create --base dev --label build-artifacts`.
   The base is **dev** (the repo default). Apply the `build-artifacts` label
   here. An Electron bump changes packaging, and reviewers must smoke-test
   the built installers. This is exactly the case for the label. The PR
   body contains:
   - What changed: the version delta and the bundled Node/Chromium.
   - The breaking changes addressed (bullet list). Frame them as adaptation
     and not as regression.
   - Checks: lint and tests pass. CI runs the cross-platform builds.
6. After the PR is open, suggest a reindex at a quiet point:
   `node .gitnexus/run.cjs analyze --index-only`. It refreshes the index for
   the changed code.

---

## Effort shortcut

- **Patch/minor within the same major**: Phases 1–2 usually find nothing
  in-repo. The plan is short ("no code changes, bump + lockfile") and still
  gated. Phases 4–6 are `package.json`, `yarn.lock`, checks, and the PR.
  Match the minimal shape of PR #3285.
- **Major**: the full path. Expect code adaptation, @types/node, builder
  bundle, and README changes, like PR #3179.
