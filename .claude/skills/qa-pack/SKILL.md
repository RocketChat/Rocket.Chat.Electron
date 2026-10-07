---
name: qa-pack
description: Author or update a QA flow pack under qa/ for a PR, branch, or release candidate by deriving steps from the implementation, then validate and export it for Qase
---

# QA Pack

Author or update a `qa/<feature-slug>/` pack for a PR, branch, or release
candidate. This skill is a thin wrapper — the full rules live in
`skills/desktop-qa-flows/SKILL.md`; read that file, don't duplicate it.

## Read fully first

- `skills/desktop-qa-flows/SKILL.md` — the canonical workflow and coverage
  rules this skill executes.
- `qa/README.md` — pack structure, flow file rules, results format.
- `qa/AGENTS.md` — schema, validation, and safety rules for everything
  under `qa/`.
- `qa/flow-template.md` — required frontmatter and body sections.
- One existing pack in full, e.g. `qa/telephony-deeplink/` (`README.md`,
  a flow under `flows/`, `test-links.html` if present) — match its shape.
- `qa/scripts/validate-flows.mjs` and `qa/scripts/export-qase-csv.mjs`
  headers — both take a single `qa/<pack>` path argument.

## Arguments

- `<base> <head>` — comparison range. Defaults: base `dev`, head the
  current branch (`git branch --show-current`).
- Or a PR number — resolve its base/head via `gh pr view <number> --json
baseRefName,headRefName`.

## Steps

### 1. Lock the comparison range

```bash
git rev-parse --abbrev-ref HEAD
git diff --stat <base>...<head>
git log <base>..<head> --oneline
```

Record base branch, head branch/commit, and whether the full requested
range is in scope for this pass — per `desktop-qa-flows` rule 1. State
this explicitly; do not claim full QA on a partial range.

### 2. Inspect the changed implementation

Read every changed file relevant to user-visible behavior from the diff
in step 1: React components, Fuselage icons, i18n labels
(`src/i18n/en.i18n.json`), menu definitions, modal buttons, platform
guards, tests, docs, installer/packaging config, helper pages. Do not
guess where UI lives or what a label says — read it.

### 3. Classify changed surfaces by user-visible risk

Use the risk list from `AGENTS.md` QA Flow Authoring section: Electron
main process, protocol handlers, OS default handlers, settings UI,
menus, modals, packaging/installers, startup, shortcuts, workspace
routing, i18n, layout. For each risky surface, write a falsifiable
hypothesis (user action, expected behavior, failure mode, platform,
proof needed).

### 4. Decide update-existing vs new pack

Compare each hypothesis against existing `qa/**/flows/*.md`. Update an
existing flow if it already covers the same hypothesis; add a new flow
file to an existing pack if the pack already owns that feature area;
create a new `qa/<feature-slug>/` pack only when the risk doesn't belong
in any existing pack. Follow `desktop-qa-flows` rules 5–7 exactly.

### 5. Write the pack

Follow `qa/flow-template.md` frontmatter and body sections exactly
(`## Review Basis`, `## Steps` table, `## Evidence`, `## Failure
Signals`). Derive every `Action` cell from what you read in step 2 —
screen region, relative position, icon shape, nearby UI, visible labels,
confirmation state — never from memory or product intuition. New packs
need a `README.md` (prerequisites, smoke order, evidence format, folder
map) matching `qa/telephony-deeplink/README.md`'s shape.

### 6. Validate and export

```bash
node qa/scripts/validate-flows.mjs qa/<slug>
node qa/scripts/export-qase-csv.mjs qa/<slug>
```

Report both commands' real output verbatim. A failing `validate-flows.mjs`
means the pack is not done — fix and re-run before reporting completion.

## Output

Report: comparison range used, files/flows created or updated, the risk
classification per surface, and the two validation/export command
outputs. Mark any surface reviewed only partially or not at all.
