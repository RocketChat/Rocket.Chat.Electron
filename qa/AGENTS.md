# QA Agent Instructions

These instructions apply to everything under `qa/`.

## Purpose

QA packs must be usable by both humans and agents. Write flows so a tester with
no feature context can follow them, while an automation agent can identify the
same preconditions, actions, expected results, and evidence.

## Before Creating Or Editing A Pack

- Inspect the feature surface first: changed files, UI components, Fuselage
  icons, i18n labels, menu definitions, modal buttons, docs, tests, helper
  pages, scripts, and platform-specific behavior.
- For branch-specific packs, lock the comparison range before authoring:
  default/base branch, head branch or commit, and whether the complete requested
  range was reviewed.
- Classify changed Desktop surfaces by user-visible risk: Electron main process,
  protocol handlers, OS default handlers, settings UI, menus, modals,
  packaging/installers, startup, shortcuts, workspace routing, i18n, and layout.
- Turn each risky change into a falsifiable hypothesis. A good hypothesis names
  the user action, expected behavior, failure mode, platform, and proof needed.
- Extract the tester-facing steps from the implementation. Do not guess where
  the feature lives, which label appears, or which control opens the next view.
- Reuse the existing pack shape from `qa/telephony-deeplink/` unless the feature
  has a concrete reason to differ.
- Keep QA artifacts under `qa/<feature-slug>/`; do not put executable QA assets
  in `docs/`.
- Do not change app behavior as part of a QA-only task.

## Pack Rules

- Create one folder per feature or release area: `qa/<feature-slug>/`.
- Include a pack `README.md` with prerequisites, smoke order, evidence format,
  and folder map.
- Put one scenario per flow file under `flows/`.
- Use numeric flow filenames so humans can run them in order.
- Add `test-links.html` or similar static helpers when testers need clickable
  protocol links, deep links, downloads, or browser-driven inputs.
- Add scripts only when they make a repeated check safer or less ambiguous.

## Flow Rules

Every flow must include:

- YAML frontmatter with `id`, `title`, `platforms`, `priority`, `requires`,
  `test_links`, `expected_result`, and a `qase` block.
- For new branch-derived flows, a `## Review Basis` section naming the changed
  surface, user-visible risk, hypothesis, and smallest useful proof.
- A `## Steps` table with `Step`, `Action`, `Test data`, `Expected result`,
  and `Agent action`.
- A `## Evidence` section.
- A `## Failure Signals` section.

Keep steps concrete and self-contained. A tester should be able to execute the
step table without opening another file or knowing the feature. Include exact
links, commands, menu names, icon location, tab names, section names, and
expected UI text when they are stable.

Write action text for visual execution. Describe screen region, relative
position, icon shape, visible text after interaction, and the visual
confirmation state. A VLM or a human looking at the app should be able to find
the control without knowing tooltip text that only appears after hover/click.

Use the implementation as the source of truth for visible steps. For Rocket.Chat
Desktop UI, check the React component tree, Fuselage icon names, translation
keys, menu action definitions, modal button labels, and platform guards. For
browser helpers, inspect the committed HTML. For OS behavior, inspect the branch
code/tests that determine which prompt, settings button, registry/default-app
state, or desktop integration is expected.

Use the smallest useful proof for the flow's hypothesis. Prefer existing tests
or targeted tests when they directly cover the behavior. Use local UI repros for
rendering and workflow risks, OS-level repros for protocol/default-handler
behavior, and code-path proof only when runtime validation is too expensive or
requires unavailable infrastructure.

Do not write separate navigation sections for basic UI discovery. Do not point
to another file for basic UI navigation. Put the visually findable path directly
in the `Action` cell where the tester needs it.

Qase rules:

- Use `qa/flow-template.md` as the schema source.
- Keep repo source IDs like `TEL-QA-001` in `id`; do not copy them into Qase's
  generated case ID column.
- Put Qase import metadata under `qase`. Leave `qase.qase_id: null` for new
  imports and fill it only when intentionally updating an existing Qase case.
- Use Qase workspace slugs for dropdown fields. If unsure, keep the existing
  pack value and note that the workspace owner must confirm it before import.

## Script Rules

- Scripts should print a concise pass/fail summary.
- Scripts should echo or document the OS commands they rely on.
- Prefer read-only checks for registry, desktop files, protocol handlers, logs,
  and package contents.
- Keep exporters deterministic and dependency-light. The QA scripts should use
  Node built-ins plus existing project dependencies only.
- If a script mutates OS state, put the mutation behind an explicit flag and
  document cleanup in the matching flow.

## Results And Evidence

- Classify findings as `confirmed` only when reproduced with evidence.
- Classify findings as `suspected` when the code path is credible but the
  behavior was not fully reproduced.
- Classify findings as `blocked` when platform, permissions, environment, or
  build access prevents validation.
- Report whether the whole requested comparison range was checked. Do not claim
  full QA for a partial surface review.
- Do not commit run-specific screenshots, logs, copied diagnostics JSON, or
  machine-specific result files unless the user explicitly asks.
- It is fine to commit `results/README.md` and placeholder guidance.
- Tell testers what evidence to capture in each flow.

## Validation

After changing QA packs:

- Run `yarn lint`.
- Run `node qa/scripts/validate-flows.mjs qa/<pack>`.
- Run `node qa/scripts/export-qase-csv.mjs qa/<pack>` when Qase compatibility
  changes.
- For HTML helpers, confirm the expected links or inputs are present in the
  file.

## Safety

- Do not install packages or download tools just to write QA flows.
- Do not alter OS protocol/default-app settings during documentation work.
- Keep branch-specific QA packs specific; avoid turning them into generic
  product documentation unless requested.
