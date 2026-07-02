---
name: desktop-qa-flows
description: Create or review Qase-ready QA flows for Rocket.Chat Desktop PRs and branches.
---

# Desktop QA Flows

Use this skill when asked to create, review, or improve QA flows for a
Rocket.Chat Desktop PR, branch, release candidate, or changed feature.

## Canonical References

Read these before authoring flows:

- `AGENTS.md`
- `qa/AGENTS.md`
- `qa/README.md`
- `qa/flow-template.md`

Those files define the schema and validation rules. This skill defines the
repeatable PR workflow.

## Workflow

1. Lock the comparison range: base branch, head branch or commit, and whether
   the requested range is fully in scope.
2. Inspect the changed implementation before writing steps: changed files,
   commits, tests, React components, Fuselage icons, i18n labels, menu
   definitions, modal buttons, platform guards, docs, installers, and helper
   pages.
3. Map changed Desktop surfaces to user-visible risk:
   - Electron main process, preload, IPC, and deep links.
   - Settings UI, menus, modals, server list, i18n, and layout.
   - OS protocol handlers, default apps, registry, desktop files, and cold
     launch behavior.
   - Packaging, installers, release policy, startup, persistence, shortcuts,
     workspace routing, and diagnostics.
4. Compare those risks with existing `qa/**/flows/*.md`.
5. Update an existing flow when it already covers the same user-visible
   hypothesis.
6. Add a new flow when the changed surface creates a new user-visible risk.
7. Create a new `qa/<feature-slug>/` pack when the risk does not belong in an
   existing pack.
8. Write every branch-derived flow with `## Review Basis`: comparison range,
   changed surface, user-visible risk, hypothesis, and smallest useful proof.
9. Keep every step visually findable. Put screen region, relative position, icon
   shape, nearby UI, visible labels, and confirmation state directly in the
   `Action` cell.
10. Add static helper HTML or read-only scripts when they reduce ambiguity for
    clickable links, protocol handlers, OS checks, or repeated evidence capture.

## Coverage Rules

- Do not claim full QA unless the full requested comparison range was checked.
- Mark unchanged or already-covered surfaces explicitly in the summary.
- Classify result findings as `confirmed`, `suspected`, or `blocked`.
- If runtime validation is not practical, use the smallest useful proof: an
  existing test, targeted test, local UI repro, OS-level repro, or code-path
  proof.
- Keep Qase source IDs in the repo and leave generated Qase IDs empty until a
  case already exists in Qase.

## Validation

After changing QA packs, run:

```sh
node qa/scripts/validate-flows.mjs qa/<pack>
node qa/scripts/export-qase-csv.mjs qa/<pack>
git diff --check
```

Report any unvalidated pack or partial surface review clearly.
