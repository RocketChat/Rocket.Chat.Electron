---
name: pr-check
description: Pre-PR gate for Rocket.Chat.Electron — runs detect_changes, lint, targeted tests, i18n parity, packaging/QA checks and drafts the PR body
disable-model-invocation: true
---

# PR Check

Run the pre-PR verification gate for this repo and draft the PR body. Do
NOT run `gh pr create` and do NOT commit anything — this skill only
verifies and drafts; handing off to the user is the last step.

## Checklist

Execute every check below in order, and report results as a table with
columns `Check | Result | Evidence`. Evidence must be real command
output or a real file diff — never an invented number (see AGENTS.md
Writing: no invented metrics).

### 1. Scope and branch

```bash
git branch --show-current
git diff --stat dev...HEAD
```

Fail this check (and stop) if the current branch is `dev` or `master` —
per AGENTS.md, never commit or open a PR directly from either.

### 2. GitNexus impact scan

Call the GitNexus MCP tool:

```
detect_changes({ scope: "compare", base_ref: "dev" })
```

List every affected symbol and execution flow it reports. If it returns
HIGH or CRITICAL risk on any symbol, surface that explicitly and warn
the user before continuing — per `CLAUDE.md`/`AGENTS.md` GitNexus rules,
do not silently proceed past a HIGH/CRITICAL warning.

### 3. Lint

```bash
yarn lint
```

(Runs `eslint .` then `tsc --noEmit` — see `package.json` scripts
`.:lint:eslint` / `.:lint:tsc`.) Report pass/fail and the error count if
it fails.

### 4. Targeted tests

Map every changed file under `src/**` (from the `git diff --stat`
output in step 1) to its spec file(s):

- Same directory: `<name>.spec.ts(x)` or `<name>.main.spec.ts` next to
  the changed file.
- Nested test directory: `__tests__/<Name>.spec.ts(x)` under the same
  module.
- If a changed file has no matching spec, note it as "no spec found"
  rather than skipping silently.

Run only the mapped specs:

```bash
yarn test --runTestsByPath <spec-path-1> <spec-path-2> ...
```

Run the **full suite** (`yarn test`) instead only if the diff touches
shared infrastructure:

- `src/store`
- `src/ipc`
- `src/i18n`
- `jest.config.js`

If none of those are touched, targeted tests are the correct scope —
do not broaden it further.

### 5. i18n parity

If `git diff --stat dev...HEAD` shows `src/i18n/en.i18n.json` changed:

```bash
git diff dev...HEAD -- src/i18n/en.i18n.json
```

Extract the added/changed keys, then check every other `src/i18n/*.i18n.json`
file for those keys (dot-notation nested lookup, same approach as the
`i18n-audit` skill). List any locale missing a newly added key. If any
locale is missing a key, run the `i18n-translate` skill to fill the gap
before opening the PR. If `en.i18n.json` did not change, mark this check
"n/a".

### 6. Packaging

If `git diff --stat dev...HEAD` shows `electron-builder.json` or the
`build` section of `package.json` changed:

```bash
git diff dev...HEAD -- electron-builder.json
```

Confirm the `win.target` entries still list `arch: ["x64", "ia32", "arm64"]`
for every Windows target (`nsis`, `msi`, `zip`) — per AGENTS.md, Windows
builds must include all three architectures. If neither file changed,
mark this check "n/a".

### 7. QA flows

If the diff touches user-visible UI (React components under
`src/ui/**`, `src/*/renderer.tsx`, menus, dialogs, settings screens),
remind the user to run `skills/desktop-qa-flows/SKILL.md` for that
change, then validate any touched or new QA pack:

```bash
node qa/scripts/validate-flows.mjs qa/<pack>
```

Only run `validate-flows.mjs` if a `qa/<pack>` was actually
created/edited for this change — otherwise mark this check "n/a" and
state the reminder was given.

### 8. Docs

If the diff introduces or changes a convention an agent would need
going forward (new IPC pattern, new test layout rule, new platform
constraint), confirm `AGENTS.md` and/or `CLAUDE.md` were updated to
match. If not applicable, mark "n/a".

## Output: PR body draft

After the checklist, print a draft PR body (do not create the PR):

```markdown
## Summary

<1-3 sentences: what changed and why, plain language>

## What changed

- <bullet per meaningful change, derived from the diff>

## Why

<the motivating bug/requirement, not restated file names>

## How verified

- `yarn lint`: <pass/fail, real output>
- `yarn test --runTestsByPath ...`: <pass/fail counts, real output>
- GitNexus `detect_changes`: <summary, real output>
- <any other check from above with a real result>

## Screenshots

<only if UI changed; otherwise omit this section>
```

Every line under "How verified" must cite an actual command and its
actual result from this run — no estimated coverage, no speculated
user impact, no invented timing numbers (AGENTS.md Writing rules).

Print the completed body in the response and stop. Do not run
`gh pr create`, do not `git commit`, do not `git push`.
