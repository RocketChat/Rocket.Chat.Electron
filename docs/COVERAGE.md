# Test Coverage History

Running log of test-coverage milestones for Rocket.Chat.Electron. Append a new row each time coverage moves materially (a merged PR, a wave of tests, a tooling change). Keep older rows — the point is to see the trajectory over time.

## How coverage is measured

- `yarn test:coverage` runs the full Jest suite with `--coverage` and writes reports to `coverage/` (`lcov.info`, `coverage-summary.json`, plus a `text-summary` to the console).
- Two Jest projects run under `@kayahr/jest-electron-runner`: renderer (electron DOM env) and main (node env). Coverage is collected across both via the root-level `collectCoverageFrom` in `jest.config.js`.
- The authoritative number is `coverage/coverage-summary.json` → `total.lines.pct` (the console `text-summary` matches it).
- CI (`.github/workflows/validate-pr.yml`) runs `yarn test:coverage` on every PR to `master`/`dev` and uploads to **Codecov** (`unit` flag). Coverage is **informational** — there is intentionally no hard `coverageThreshold` gate, matching the main Rocket.Chat monorepo's house style (`codecov.yml`: `patch: off`, project `target: auto / threshold: 1%`).

## How to update this log

1. Run `yarn test:coverage` locally (or read the Codecov report for the merged commit).
2. Read the four totals from `coverage/coverage-summary.json` (`total.{lines,statements,branches,functions}.pct`) and the suite tally from the run.
3. Add a row to the table below: date, the milestone/PR, the four percentages, total test count, and a one-line note.
4. Never edit or delete past rows — only append. The history is the value.

## History

| Date | Milestone | Lines | Statements | Branches | Functions | Tests | Notes |
|------|-----------|-------|------------|----------|-----------|-------|-------|
| 2026-06-22 | Baseline — measurement tooling added (#3362) | 17.15% | 17.67% | 13.18% | 11.87% | ~282 | First real line-coverage number. Coverage collection wired (no tests added yet). The earlier "~8%" figure was a files-with-a-spec ratio, not line coverage. |
| 2026-06-22 | Phase 1 — pure-logic unit tests (#3363) | 22.34% | 22.91% | 20.39% | 16.11% | 640 | Reducers (servers/updates/navigation), log redaction + dedup, Outlook error classification, i18n formatters, store helpers, critical-error matcher, logging context, desktop-capturer cache. |
| 2026-06-22 | Phase 2 — extract-and-test moderate modules (#3364) | 26.34% | 26.76% | 23.61% | 19.17% | 802 | navigation cert utils, ScreenSharingRequestTracker, browserLauncher, ipc/renderer, logging factory; relocated a silently-never-running getOutlookEvents spec (0%→~95%). |
| 2026-06-22 | Phase 3 — React Testing Library + renderer component tests (#3365) | 33.29% | 33.65% | 29.33% | 27.31% | 912 | Added RTL infra (`src/ui/test-utils.tsx`) + 14 component specs (dialogs, containers, leaf, ui/utils). 3 specs held back (see Known gaps). |
| 2026-06-22 | RC-style Codecov reporting (#3366) | 33.29% | 33.65% | 29.33% | 27.31% | 912 | No coverage change — switched CI to Codecov (informational, no hard gate) to match the main monorepo. |

## Known gaps / next steps

- **Goal:** 50% lines. At 33.29% as of the last row — reachable via the renderer (`ui/`) layer alone; no need to test webview/Electron-integration files.
- **Quarantined specs** (written but held back — they leak async/DOM teardown that the strict `uncaughtException` handler in `src/.jest/setup.ts` turns into a suite-killing `process.exit(1)`): `ServersView/ErrorView`, `ServerInfoContent`, `AboutDialog`. Re-enabling these (with proper fake-timer / async cleanup) is the cheapest next win. See `docs/KNOWN_ISSUES.md`.
- **Remaining headroom:** the rest of `ui/components` dialogs/containers, and non-webview `ui/main` logic.

## Testing notes (gotchas worth knowing before adding specs)

- **Spec placement:** the renderer `testMatch` glob silently drops flat `src/<dir>/*.spec.ts` — specs need an intermediate non-`main` subdir (e.g. `__tests__/`) or the `.main.spec.ts` / `renderer.spec.ts` naming. Confirm with `yarn jest --listTests | grep <file>` before assuming a spec runs.
- **RTL works out-of-box** under the electron runner (real DOM, no jsdom). Use `renderWithStore` from `src/ui/test-utils.tsx` and the documented `react-i18next` mock.
- **`userEvent.type` does NOT commit to React controlled inputs** under this runner — use `fireEvent.change` to set input values.
- **Timers/listeners leak the whole suite:** any component effect with a real `setInterval`/`setTimeout` (or unremoved listener) that survives unmount becomes an uncaught exception → `process.exit(1)` kills the run. Specs touching such components must use `jest.useFakeTimers()` + `afterEach(() => { jest.clearAllTimers(); jest.useRealTimers(); })`.
- **Never run the full suite to self-verify per spec** — write specs, then batch-verify once with `yarn test:coverage`. Per-spec full runs reboot electron repeatedly and orphan processes.
