# Post-Mortem: validate-pr CI from 34 to 5 minutes (CORE-2657, PR #3511)

## Objective

Cut the wall time of the `Validate pull request` workflow, which had grown to
24–36 minutes per platform and made every PR iteration wait on the Jest step.

## Impact

Baseline run 35597079932 on `dev` vs final run 35642580925 on the PR.

|                               | Before                        | After                    | Change                |
| ----------------------------- | ----------------------------- | ------------------------ | --------------------- |
| Wall time, free runners       | 34 min                        | **5.2 min**              | **6.5× faster, −85%** |
| Slowest Test step             | 27m15s (windows)              | 3m17s (macos shard 2)    | 8× faster, −88%       |
| Build + smoke-launch feedback | after the Test step (~30 min) | 2.4–5.1 min, in parallel | 6–12× sooner          |
| Jobs per PR                   | 3                             | 9                        | 3× more runners       |

Step by step:

| Step                                  | Wall time after | Step gain  | Cumulative |
| ------------------------------------- | --------------- | ---------- | ---------- |
| Baseline                              | 34 min          |            |            |
| Shard across jobs, coverage on one OS | 17.2 min        | 2.0×, −49% | 2.0×, −49% |
| ts-jest transpile-only (one line)     | 7.1 min         | 2.4×, −59% | 4.8×, −79% |
| Caches warm, ubuntu shards on arm64   | 5.2 min         | 1.4×, −27% | 6.5×, −85% |

Other observable effects:

- 18 preload/renderer specs that `jest.config.js` excludes under `--coverage`
  now gate Windows and macOS. Before, every OS ran the coverage variant, so
  those specs did not participate in PR checks on any platform.
- Docs-only PRs (`**.md`) no longer start the matrix.

### Per platform

The longest job is the platform's critical path: before, its single job;
after, the slowest of its two test shards and its build job.

Longest job:

| Platform         | Before   | After           | Change     |
| ---------------- | -------- | --------------- | ---------- |
| windows          | 34.2 min | 5.2 min (build) | 6.6×, −85% |
| ubuntu (→ arm64) | 24.7 min | 4.2 min         | 5.9×, −83% |
| macos            | 23.4 min | 5.0 min         | 4.7×, −79% |

Slowest Test step:

| Platform         | Before   | After   | Change     |
| ---------------- | -------- | ------- | ---------- |
| windows          | 27.3 min | 3.0 min | 9.1×, −89% |
| ubuntu (→ arm64) | 21.5 min | 2.9 min | 7.4×, −86% |
| macos            | 18.5 min | 3.3 min | 5.6×, −82% |

Windows gained the most because it paid the most for the per-file
type-check; its critical path is now the build job packaging x64 and ia32,
not the tests. The three platforms finish within a minute of each other,
where Windows used to trail by ten. macOS gained the least because its
runner was already the fastest at the per-file Electron spawn that remains.

## Timeline

### Diagnosis: where the time went

`gh run view --json jobs` on a green run gave the Test step at 27m15s on
windows, 21m32s on ubuntu and 18m31s on macos; install, lint and build were
1–3 minutes combined. `@kayahr/jest-electron-runner` forces `--maxWorkers=1`
and spawns one Electron process per spec file, so intra-job parallelism was
not available.

A parallel reading attributed the slowdown to the GitHub Windows runners
("7 minutes through May, 27–35 now"). Monthly job history disproved it: the
Windows Test step was about 1 minute through April 2026 and the suite grew
from roughly 282 to 2567 tests across the June and August coverage waves.
Install, lint and build stayed flat. The runners had not changed; the suite
had, and each spec file was paying a full type-check.

### Attempt 1: shard across jobs, coverage only on ubuntu (succeeded)

**What was done:** Split the single `check` job into `test` (3 OSes × 2
`--shard` jobs) and `build` (lint, rollup, `electron-builder --dir`, smoke
launch), running concurrently. Ubuntu shards run `yarn test:coverage` and
upload to Codecov; Windows and macOS run plain `yarn test`. Codecov merges
same-commit, same-flag uploads server-side, so no local report merge was
needed.

**Result:** 17.2 minutes wall (run 35631049933). Test per shard: windows
11.0 / 14.4 min, macos 12.4 / 10.6, ubuntu 11.2 / 11.3.

**Follow-up in the same PR:** `timeout-minutes: 45` on the test job. A
report of a 77-minute Windows hang on another PR was plausible with this
runner, and the job had no ceiling below GitHub's 6-hour default.

### Attempt 2: transpile-only ts-jest (succeeded, largest single win)

**What was done:** Measured locally first. Four specs / 97 tests, cold Jest
cache, sequential runs: 22.4–23.5 s with default ts-jest, 8.8–11.3 s with
isolated-module transpilation. CI never has a warm Jest cache, so every run
paid the cold cost. Switched the three Jest projects from `preset: 'ts-jest'`
to an explicit transform with `tsconfig: { isolatedModules: true }` as an
inline override, leaving `tsconfig.json` unchanged. Bumped ts-jest
~29.1.4 → ~29.4.12. Type errors in specs are still caught by `tsc --noEmit`
in `yarn lint`, which includes all spec files.

**Result:** 7.1 minutes wall on cold caches (run 35640750648); Test per shard
165–214 s, down from 644–880 s. Full suite passes cold locally in 265 s.

**Note on the ts-jest option:** ts-jest deprecated its own `isolatedModules`
transform option in 29.2 and introduced `transpilation` in 29.4.3, but the
installed 29.4.12 build does not carry `transpilation`. The inline tsconfig
override is the form that works on 29.4.x without a deprecation warning.

### Attempt 3: arm64 Ubuntu shards, first try (failed)

**What was done:** Moved the Ubuntu test shards to `ubuntu-24.04-arm`, kept
the build job on x64 because it packages and smoke-launches the x64 binary,
and added `runner.arch` to the cache keys so arm64 and x64 Linux never share
a node_modules or Electron cache.

**What went wrong:** Both arm shards failed in `yarn install` after 48 s.

**Root cause:** puppeteer's postinstall downloads Chromium, and there is no
arm64 Linux Chromium build. puppeteer is used only by `yarn build-assets`;
the single spec that imports it (`buildAssets.main.spec.ts`) mocks the
module.

### Attempt 4: arm64 Ubuntu shards, second try (succeeded, parity)

**What was done:** `PUPPETEER_SKIP_DOWNLOAD: 'true'` on the test job, which
also removes an unused download from the Windows and macOS shards.

**Result:** Both arm shards green with coverage uploaded (run 35642580925):
167 / 175 s vs 165 / 166 s on x64. Parity, not a speedup. Kept because the
arm pool is separate free capacity. Wall time with warm caches: 5.2 minutes.

### Evaluation: `@swc/jest` (measured, not adopted)

**What was done:** Installed `@swc/jest` 0.2.39 + `@swc/core` 1.16.2 with
the same `jsc` options as the Rocket.Chat monorepo's client preset and ran
the same benchmarks. Four specs cold: 6.3–6.7 s wall vs 7.6–9.3 s with
transpile-only ts-jest. Full suite: 226 s, 256 of 258 suites pass.

**Why not adopted:** The two failures are spec patterns that depend on
TypeScript's CommonJS emit. `src/ui/main/rootWindow.spec.ts` assigns onto
module exports, which swc emits as read-only getters (9 tests).
`src/updates/main/setupUpdates.main.spec.ts` has a `jest.mock` factory
reading a `const` that swc's stricter hoisting evaluates in its temporal dead
zone (2 tests). Projected CI effect was 20–30 s per shard, about 0.4 minutes
of wall time. Rewriting two specs, teaching swc's hoisting rules and adding a
native binary to every job's cache was not justified. The experiment was
reverted; `package.json` carries only the ts-jest bump.

### Review follow-up

CodeRabbit asked to drop `always()` from the Codecov upload so a shard that
fails mid-run does not merge a partial report into the `unit` flag. Applied;
the artifact fallback keeps `always()` for debugging. The run after that
change was green with unchanged per-job times, but wall time was 15.6
minutes because every job waited 7–10 minutes in the runner queue at that
hour. The same matrix had started within seconds earlier in the day.

## Lessons Learned

### 1. Pull step timings before attributing a slowdown

Three independent readings blamed the CI environment. One `gh run view
--json jobs` per month of history showed the Test step going from 1 minute to
27 while everything else stayed flat, which pointed at suite growth and
transform cost, not runners. Attribution without step-level data would have
sent the work toward runner classes, where the payoff was zero.

### 2. Check the transform mode before adding runners

The default ts-jest mode builds a type-checking Program per spec file, and
CI has no warm Jest cache. Transpile-only mode was a one-line change worth a
4× reduction in the Test step — more than sharding, arm64 and caching
combined. Type safety was never at stake because `tsc --noEmit` already
covered the specs in lint.

### 3. Know what the runner's constraint really costs

`@kayahr/jest-electron-runner` spawns one Electron process per spec file and
forces one worker. After the transform fix, that spawn is most of the
remaining ~3 minutes per shard. No transformer, runner label or cache changes
it; only cross-job sharding or an upstream runner change does. Measure the
per-file floor before spending effort on the next percent of transform time.

### 4. Cache keys must include architecture as soon as two Linux arches run

`runner.os` is `Linux` on both `ubuntu-latest` and `ubuntu-24.04-arm`. A key
built only from `runner.os` would restore x64 native binaries into an arm64
job. Add `runner.arch` before the first arm job, not after the first
confusing failure.

### 5. A dependency's postinstall is part of your platform matrix

puppeteer is a build-tooling dependency that never runs in tests, but its
postinstall ran in every job and had no arm64 Linux artifact. Scope
downloads to the jobs that need them with the tool's own skip variable.

### 6. Spec patterns can silently depend on the compiler's emit

Assigning onto `require(mod).fn` and reading a `const` inside a `jest.mock`
factory both work under TypeScript's CommonJS output and fail under swc.
Before switching transformers, grep the specs for those two patterns; that
is the real migration cost, not the config change.

### 7. Coverage exclusions can hide specs from every platform

The 18 specs excluded under `--coverage` were excluded on all three OSes
because all three ran the coverage variant. Any exclusion keyed to a flag
needs at least one CI leg that runs without the flag.

## What this does NOT fix

- `build-release.yml` still runs the full suite unsharded with the same
  per-file Electron spawn; it was left out on purpose to keep the PR to what
  makes developers wait.
- The 5-minute figure assumes free runners. Nine jobs instead of three means
  more exposure to organization-level queue contention; the run at 19:33 UTC
  on 2026-09-21 waited 7–10 minutes per job.
- The heap-ceiling accumulation described in `docs/KNOWN_ISSUES.md` is
  halved per job by sharding but not fixed; the runner still disposes
  Electron children only at end of run.
- `paths-ignore: ['**.md']` must be removed if validate-pr jobs ever become
  required status checks, or docs-only PRs will wait on checks that never
  run.
