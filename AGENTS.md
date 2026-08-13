# Agent Instructions

These instructions apply to the repository root. More specific `AGENTS.md`
files in subdirectories override or extend this file. This is the canonical
guidance file for all coding agents (Codex, Claude Code, Cursor, Hermes,
GitHub agents, etc.) — `CLAUDE.md` imports it and adds only Claude-specific
content, if any.

## Project Basics

- TypeScript codebase. Use TypeScript strict mode for all new code unless
  explicitly told otherwise.
- Run root commands from the repository root. Do not run `yarn build` inside
  workspace directories — it creates incorrect output structures. Always use
  root commands.
- Common commands:

```sh
yarn install && yarn start   # Dev mode
yarn build                   # Rollup compile to app/
yarn lint && yarn test       # Lint + test
yarn workspaces:build        # Build all workspaces
```

- After building `desktop-release-action`, remove the nested dist:
  `rm -rf workspaces/desktop-release-action/dist/dist` — the action only
  needs `workspaces/desktop-release-action/dist/index.js`.

## Patches And Builds

- Do not confuse the two patch systems:
  - Yarn patch protocol: `.yarn/patches/`, currently for `@ewsjs/xhr`
    (configured in `package.json`).
  - `patch-package`: `patches/`, currently for `@kayahr/jest-electron-runner`.
- Never add `@ewsjs/xhr` patches to `patches/`; that creates CI conflicts.
- Windows builds must include all architectures: `x64`, `ia32`, and `arm64`.
- Code signing uses Google Cloud KMS in two phases:
  1. Build packages without signing (empty env vars).
  2. Sign built packages using `jsign` with Google Cloud KMS.

  This prevents MSI build failures from KMS CNG provider conflicts.
- `electron-builder.json`'s `mac.bundleVersion` (macOS `CFBundleVersion`) is
  independent from `package.json`'s `version` and must be bumped on every
  release that ships to the App Store / gets notarized — Apple requires each
  submission's `CFBundleVersion` to strictly increase over the last one.
  Format: `YYMM` + a single-digit build counter that resets to `0` at the
  start of each month, e.g. the first build shipped in August 2026 is
  `26080`, the second same-month build is `26081`. Check the current value
  and the date of its last bump (`git log -p --follow -- electron-builder.json`)
  before incrementing — do not guess an arbitrary increment.

## Releases And Tagging

- **Always create release tags with `yarn release:tag`** — never hand-rolled
  `git tag` + `git push`. The script (`scripts/release-tag.ts`) reads the
  version from `package.json`, fetches the refs allowed for that version's
  channel, and fails closed (exit 1) on every unsafe case. Tagging by hand
  skips all of it.
- Which remote refs are allowed depends on the channel: prerelease tags
  (alpha/beta/rc — any version with a prerelease id) must have HEAD as an
  ancestor of `origin/dev` or any `origin/release/*` branch; stable tags
  (no prerelease id) must have HEAD as an ancestor of `origin/master` or any
  `origin/release/*` branch. `origin/release/*` branches are discovered via
  `git ls-remote --heads origin 'release/*'` at run time.
- Guards, and how to override each:

  | Guard | Override |
  |---|---|
  | Invalid semver in `package.json` | none |
  | HEAD not an ancestor of an allowed ref for its channel | `--allow-unverified-ref` |
  | Tag already exists | none — not even `--force` |
  | Version not greater than latest tag **in its channel** | `--force` |

- Channel (stable / alpha / beta / candidate) is detected from the version and
  compared only within itself, so an alpha never blocks a stable or vice versa.
- Flags: `--yes` / `-y` skips the confirmation prompt (also skipped
  automatically when `CI=true`); `--help` lists everything. Without `--yes` the
  prompt reads a real TTY, so piping `echo y` is unreliable — use the flag.
- Tag the **squashed merge/bump commit on the branch the channel expects**
  (dev for prereleases; master, or a `release/X.Y.x` branch for patch
  releases, for stables), never a pre-merge bump commit on an unmerged
  branch — that ships the wrong tree. The ref-ancestor guard enforces this;
  if it fires, fix the checkout rather than overriding it.
- A fresh worktree has no `node_modules`, so the script dies with
  `Couldn't find the node_modules state file (findPackageLocation)`. Run
  `yarn install` in the worktree — never work around it by tagging by hand.
- If a guard fires, treat it as a real finding: report it and fix the cause.
  Do not reach for `--force` or `--allow-unverified-ref` without the
  release owner explicitly agreeing.
- Tag names are the bare version (`4.16.0`, no `v` prefix). `build-release.yml`
  triggers on any tag push, and the auto-updater feed derives from
  `package.json`'s version, which MUST match the tag.
- Pure tag/channel logic lives in `scripts/releaseTag.lib.ts` and is unit
  tested (`scripts/releaseTag.lib.spec.ts`); `release-tag.ts` keeps the I/O.
  Script specs run under their own Jest project (`testEnvironment: 'node'`).
- The full end-to-end flow (notes, bump PR, merge, tag, CI, asset matrix, Jira
  release sync) is driven by the `ship-release` skill.

## UI Work

- Use Fuselage components from `@rocket.chat/fuselage` for UI work unless the
  design requires something Fuselage does not provide.
- Check `Theme.d.ts` for valid color tokens before using Fuselage colors.
- Reference: [Fuselage Storybook](https://rocketchat.github.io/fuselage) and
  [Rocket.Chat main repo](https://github.com/RocketChat/Rocket.Chat) for usage
  patterns.
- Verify library props, APIs, and tokens against official docs or local
  `.d.ts` files instead of assuming.
- Before styling tab bar/titlebar controls, custom SVG artwork, or picking
  color/animation tokens, read `docs/desktop-ui-guidelines.md` — token
  semantics and traps, Fuselage geometry/timing facts, the button-dimming and
  SVG transform-origin pitfalls, and layout rules learned in PRs #3441/#3443.

## Testing

- Renderer specs use `*.spec.ts` / `*.spec.tsx`.
- Main-process specs use `*.main.spec.ts`.
- Renderer specs must live in a Jest-matched nested path, for example
  `src/<module>/<subdir>/*.spec.ts(x)` or
  `src/<module>/renderer.spec.ts(x)`. Flat `src/<module>/*.spec.ts` files are
  not discovered by the current `testMatch`.
- Verify new specs with `yarn test --listTests --runTestsByPath <file>` when
  discovery is uncertain.
- Uses `@kayahr/jest-electron-runner` for Electron environment simulation.
- Tests run on Windows, macOS, and Linux CI — always verify cross-platform
  behavior.
- UI changes need runtime/visual verification — component tests cannot see
  paint (a clipped SVG passes every DOM assertion). Use the `dev-app-verify`
  skill (`skills/dev-app-verify/SKILL.md`) to drive and screenshot the running
  `yarn start` app via the port-9339 inspector, and the Developer Mode menu
  items (`Simulate Update Flow` / `Simulate Download`) to exercise the flows
  without real downloads/updates.
- Screen-capture / WebRTC / portal behavior CANNOT be validated in
  software-rendered VMs — Chromium gates the PipeWire capture path on
  hardware GL (the gate moves between Electron versions). Validate on
  hardware GL (GPU passthrough or physical machine) and prefer dbus-level
  assertions (`org.freedesktop.portal.ScreenCast` requests) over dialog
  visibility, which is portal/boot-state flaky. Full story:
  `docs/postmortem-screen-picker-startup-enumeration.md`
- Prefer optional chaining and fallbacks for platform-specific APIs:

```typescript
// PREFERRED — works on all platforms without mocks
const uid = process.getuid?.() ?? 1000;
const runtimeDir = process.env.XDG_RUNTIME_DIR || `/run/user/${process.getuid?.() ?? 1000}`;
```

  Only mock when defensive coding isn't possible. Linux-only APIs requiring
  this: `process.getuid()`, `process.getgid()`, `process.geteuid()`,
  `process.getegid()`.

## QA Flow Authoring

When creating or updating QA assets under `qa/`, read these first:

- `skills/desktop-qa-flows/SKILL.md` when the task is for a Desktop PR, branch,
  or release-candidate QA pass. This file is plain Markdown and can be used by
  any agent, including Codex, Claude, Hermes, Cursor, and GitHub agents, when
  explicitly pointed to it. It decides whether to update existing flows, add
  new flows, or create a new `qa/<feature-slug>/` pack based on changed
  user-visible risk.
- `qa/README.md`
- `qa/AGENTS.md`
- `qa/flow-template.md`

QA flows must be executable by a QA engineer or visual agent that knows nothing
about the feature. Do not guess where UI lives. Derive every user-facing step
from the implementation, not product intuition: changed React components,
Fuselage icons, i18n labels, menu definitions, modal buttons, platform
branches, tests, and helper pages.

For branch-specific QA packs, lock the comparison range before deriving flows:
record the base branch, head branch or commit, and whether the whole requested
range was reviewed. Do not claim complete QA coverage for a partial review.
Classify changed Desktop surfaces by user-visible risk — Electron main
process, protocol handlers, OS default handlers, settings UI, menus, modals,
packaging/installers, startup, shortcuts, workspace routing, i18n, and layout
— then turn each risk into a falsifiable hypothesis the flow proves or
disproves. Prefer the smallest useful proof: existing tests, targeted tests,
local UI repro, OS-level repro, or code-path proof when runtime validation is
not practical.

Write the visible path directly in the flow step `Action` cell. Do not create
separate navigation sections or ask testers to open another file for basic UI
discovery. Include screen region, relative position, icon shape, nearby UI,
visible labels after interaction, and the visual confirmation state. If a
label only appears as a tooltip or after clicking a menu, describe the visible
anchor first.

For Qase compatibility, keep the flow table columns aligned with
`qa/flow-template.md` and validate QA packs with:

```sh
node qa/scripts/validate-flows.mjs qa/<pack>
node qa/scripts/export-qase-csv.mjs qa/<pack>
```

## Code Style

- TypeScript strict mode.
- React functional components with hooks.
- Redux actions follow FSA (Flux Standard Action) shape.
- File naming: camelCase for files, PascalCase for components.
- No unnecessary comments — self-documenting code through clear naming.
- Prefer editing existing files over creating new abstractions unless the new
  abstraction removes real complexity or matches an existing pattern.

## Git And Verification

- Never commit or push without explicit user permission — "fix this" does NOT
  mean "commit it".
- Never commit directly to `master` or `dev` — create a branch, test, open a
  PR.
- Read-only git operations (status, diff, log) are always fine.
- Show what will be committed before committing.

### Worktrees

Use worktrees to avoid disrupting another working directory:

```bash
mkdir -p ../Rocket.Chat.Electron-worktrees
git worktree add ../Rocket.Chat.Electron-worktrees/feature-name -b new-branch master
```

### Working Principles

- **Understand before changing** — understand WHY code is written that way.
  Working code is correct until proven otherwise. If unsure, ASK.
- **Verify your work** — run tests, check types (`npx tsc --noEmit`),
  demonstrate correctness. Never mark a task done without proving it works.
- **Diagnose before iterating** — when approaches fail, analyze WHY before
  trying the next one. Don't cycle through 3+ approaches blindly.
- **Always verify libraries** — check official docs and `.d.ts` files in
  `node_modules/`. Never assume props, tokens, or APIs work without
  verification.
- Verify work with the narrowest meaningful checks first, then broader checks
  when risk or shared behavior justifies it.
- If GitNexus tooling is available, use the GitNexus section below for
  impact analysis and affected-scope checks. If it is unavailable, do not
  block progress solely on that tool; compensate with local code search,
  tests, and careful review.
- Reindex GitNexus with `node .gitnexus/run.cjs analyze --index-only` and
  only at quiet points: a plain `analyze` rewrites the gitnexus blocks in
  `AGENTS.md`/`CLAUDE.md` (stats churn in tracked files), and a background
  analyze mutates worktree git state — it can silently drop freshly staged
  files from the index and touch watched sources, restarting a running
  `yarn start` app mid-verification.

## Writing

- Avoid subjective descriptors ("smart", "excellent", "dumb").
- Use measurable descriptions: "reduced memory usage", "improved by X%".
- Never invent metrics — no estimated time spent, no speculated user counts.
  Only include numbers from actual logs, error messages, or documented
  sources.
- PR descriptions: straightforward language, focus on what changed and why.

<!-- gitnexus:start -->
# GitNexus — Code Intelligence

This project is indexed by GitNexus as **Rocket.Chat.Electron**. Use the GitNexus MCP tools to understand code, assess impact, and navigate safely — read `gitnexus://repo/Rocket.Chat.Electron/context` for current index stats and staleness.

> Index stale? Run `node .gitnexus/run.cjs analyze` from the project root — it auto-selects an available runner. No `.gitnexus/run.cjs` yet? `npx gitnexus analyze` (npm 11 crash → `npm i -g gitnexus`; #1939).

## Always Do

- **MUST run impact analysis before editing any symbol.** Before modifying a function, class, or method, run `impact({target: "symbolName", direction: "upstream"})` and report the blast radius (direct callers, affected processes, risk level) to the user.
- **MUST run `detect_changes()` before committing** to verify your changes only affect expected symbols and execution flows. For regression review, compare against the default branch: `detect_changes({scope: "compare", base_ref: "master"})`.
- **MUST warn the user** if impact analysis returns HIGH or CRITICAL risk before proceeding with edits.
- When exploring unfamiliar code, use `query({query: "concept"})` to find execution flows instead of grepping. It returns process-grouped results ranked by relevance.
- When you need full context on a specific symbol — callers, callees, which execution flows it participates in — use `context({name: "symbolName"})`.

## Never Do

- NEVER edit a function, class, or method without first running `impact` on it.
- NEVER ignore HIGH or CRITICAL risk warnings from impact analysis.
- NEVER rename symbols with find-and-replace — use `rename` which understands the call graph.
- NEVER commit changes without running `detect_changes()` to check affected scope.

## Resources

| Resource | Use for |
|----------|---------|
| `gitnexus://repo/Rocket.Chat.Electron/context` | Codebase overview, check index freshness |
| `gitnexus://repo/Rocket.Chat.Electron/clusters` | All functional areas |
| `gitnexus://repo/Rocket.Chat.Electron/processes` | All execution flows |
| `gitnexus://repo/Rocket.Chat.Electron/process/{name}` | Step-by-step execution trace |

## CLI

| Task | Read this skill file |
|------|---------------------|
| Understand architecture / "How does X work?" | `.claude/skills/gitnexus/gitnexus-exploring/SKILL.md` |
| Blast radius / "What breaks if I change X?" | `.claude/skills/gitnexus/gitnexus-impact-analysis/SKILL.md` |
| Trace bugs / "Why is X failing?" | `.claude/skills/gitnexus/gitnexus-debugging/SKILL.md` |
| Rename / extract / split / refactor | `.claude/skills/gitnexus/gitnexus-refactoring/SKILL.md` |
| Tools, resources, schema reference | `.claude/skills/gitnexus/gitnexus-guide/SKILL.md` |
| Index, status, clean, wiki CLI commands | `.claude/skills/gitnexus/gitnexus-cli/SKILL.md` |

<!-- gitnexus:end -->
