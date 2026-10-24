# QA Agent Instructions

These instructions apply to everything under `qa/`.

## Purpose

QA packs serve both humans and agents. A QA engineer or visual agent that knows
nothing about the feature must be able to run each flow. An automation agent
must be able to identify the same preconditions, actions, expected results, and
evidence.

## Read First

Before you create or update QA assets under `qa/`, read these files:

- `skills/desktop-qa-flows/SKILL.md` for a Desktop PR, branch, or
  release-candidate QA pass. It is plain Markdown, and any agent can use it
  when pointed to it (Codex, Claude, Hermes, Cursor, GitHub agents). It decides
  whether to update existing flows, add new flows, or create a new
  `qa/<feature-slug>/` pack, based on the changed user-visible risk.
- `qa/README.md`
- `qa/flow-template.md`

## Before Creating Or Editing A Pack

- Inspect the feature surface first: changed files, UI components, Fuselage
  icons, i18n labels, menu definitions, modal buttons, docs, tests, helper
  pages, scripts, and platform-specific behavior.
- For branch-specific packs, lock the comparison range before you derive
  flows. Record the default/base branch and the head branch or commit. Record
  whether you reviewed the complete requested range.
- Classify changed Desktop surfaces by user-visible risk. The surfaces are
  the Electron main process, protocol handlers, OS default handlers, settings
  UI, menus, modals, packaging/installers, startup, shortcuts, workspace
  routing, i18n, and layout.
- Turn each risky change into a falsifiable hypothesis that the flow proves or
  disproves. A good hypothesis names the user action, expected behavior,
  failure mode, platform, and proof needed.
- Extract the tester-facing steps from the implementation, not from product
  intuition. Do not guess where the feature lives, which label appears, or
  which control opens the next view.
- Reuse the existing pack shape from `qa/telephony-deeplink/` unless the feature
  has a concrete reason to differ.
- Keep QA artifacts under `qa/<feature-slug>/`. Do not put executable QA assets
  in `docs/`.
- Do not change app behavior in a QA-only task.

## Pack Rules

- Create one folder per feature or release area: `qa/<feature-slug>/`.
- Include a pack `README.md` with prerequisites, smoke order, evidence format,
  and folder map.
- Put one scenario per flow file under `flows/`.
- Use numeric flow filenames so humans can run them in order.
- Add `test-links.html` or a similar static helper when testers need clickable
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

Keep steps concrete and self-contained. A tester must be able to execute the
step table without opening another file or knowing the feature. Include exact
links, commands, menu names, icon location, tab names, section names, and
expected UI text when they are stable.

Write action text for visual execution. Describe the screen region and the
relative position. Describe the icon shape, nearby UI, visible text after
interaction, and the visual confirmation state. A VLM or a human who looks at
the app must be able to find the control. Do not rely on tooltip text that only
appears after hover/click. If a label only appears as a tooltip or after a menu
click, describe the visible anchor first.

Use the implementation as the source of truth for visible steps. For Rocket.Chat
Desktop UI, check the React component tree, Fuselage icon names, translation
keys, menu action definitions, modal button labels, and platform guards. For
browser helpers, inspect the committed HTML. For OS behavior, inspect the branch
code and tests that determine which prompt, settings button,
registry/default-app state, or desktop integration to expect.

Use the smallest useful proof for the flow's hypothesis. Prefer an existing
test or a targeted test when it directly covers the behavior. Use a local UI
repro for rendering and workflow risks. Use an OS-level repro for
protocol/default-handler behavior. Use code-path proof only when runtime
validation is too expensive or needs unavailable infrastructure.

Write the visually findable path directly in the `Action` cell where the
tester needs it. Do not write separate navigation sections for basic UI
discovery. Do not point to another file for basic UI navigation.

Qase rules:

- Use `qa/flow-template.md` as the schema source.
- Keep repo source IDs like `TEL-QA-001` in `id`. Do not copy them into Qase's
  generated case ID column.
- Put Qase import metadata under `qase`. Leave `qase.qase_id: null` for new
  imports and fill it only when intentionally updating an existing Qase case.
- Use Qase workspace slugs for dropdown fields. If you are unsure, keep the
  existing pack value. Add a note that the workspace owner must confirm the
  value before import.

## Script Rules

- Print a concise pass/fail summary from each script.
- Echo or document the OS commands that each script uses.
- Prefer read-only checks for registry, desktop files, protocol handlers, logs,
  and package contents.
- Keep exporters deterministic and dependency-light. Use Node built-ins and
  existing project dependencies only in QA scripts.
- If a script mutates OS state, put the mutation behind an explicit flag and
  document cleanup in the matching flow.

## Results And Evidence

- Classify a finding as `confirmed` only when you reproduced it with evidence.
- Classify a finding as `suspected` when the code path is credible but you did
  not fully reproduce the behavior.
- Classify a finding as `blocked` when platform, permissions, environment, or
  build access prevents validation.
- Report whether you checked the whole requested comparison range. Do not claim
  full QA for a partial surface review.
- Do not commit run-specific screenshots, logs, copied diagnostics JSON, or
  machine-specific result files unless the user explicitly asks.
- You may commit `results/README.md` and placeholder guidance.
- Tell testers what evidence to capture in each flow.

## Validation

After changing QA packs:

- Run `yarn lint`.
- Run `node qa/scripts/validate-flows.mjs qa/<pack>`.
- Run `node qa/scripts/export-qase-csv.mjs qa/<pack>` when Qase compatibility
  changes.
- For HTML helpers, check that the file contains the expected links or inputs.

## Safety

- Do not install packages or download tools just to write QA flows.
- Do not change OS protocol/default-app settings during documentation work.
- Keep branch-specific QA packs specific. Do not turn them into generic
  product documentation unless the user asks.
