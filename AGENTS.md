# Agent Instructions

These instructions apply to the repository root. More specific `AGENTS.md`
files in subdirectories override or extend this file.

`CLAUDE.md` is the historical project guide. When it changes, review it and
carry forward only durable repo guidance here; do not blindly copy
Claude-specific, stale, or unavailable-tool instructions.

## Project Basics

- TypeScript codebase. Use TypeScript for new code unless explicitly told
  otherwise.
- Run root commands from the repository root. Do not run `yarn build` inside
  workspace directories; it creates incorrect output structures.
- Common commands:

```sh
yarn install && yarn start
yarn build
yarn lint && yarn test
yarn workspaces:build
```

- After building `desktop-release-action`, remove
  `workspaces/desktop-release-action/dist/dist`; the action only needs
  `workspaces/desktop-release-action/dist/index.js`.

## Patches And Builds

- Do not confuse the two patch systems:
  - Yarn patch protocol: `.yarn/patches/`, currently for `@ewsjs/xhr`.
  - `patch-package`: `patches/`, currently for `@kayahr/jest-electron-runner`.
- Never add `@ewsjs/xhr` patches to `patches/`; that creates CI conflicts.
- Windows builds must include all architectures: `x64`, `ia32`, and `arm64`.
- Code signing uses Google Cloud KMS in two phases: build packages without
  signing, then sign built packages with `jsign`.

## UI Work

- Use Fuselage components from `@rocket.chat/fuselage` for UI work unless the
  design requires something Fuselage does not provide.
- Check `Theme.d.ts` for valid color tokens before using Fuselage colors.
- Verify library props, APIs, and tokens against official docs or local
  `.d.ts` files instead of assuming.

## Testing

- Renderer specs use `*.spec.ts` / `*.spec.tsx`.
- Main-process specs use `*.main.spec.ts`.
- Renderer specs must live in a Jest-matched nested path, for example
  `src/<module>/<subdir>/*.spec.ts(x)` or
  `src/<module>/renderer.spec.ts(x)`. Flat `src/<module>/*.spec.ts` files are
  not discovered by the current `testMatch`.
- Verify new specs with `yarn test --listTests --runTestsByPath <file>` when
  discovery is uncertain.
- Tests run on Windows, macOS, and Linux CI. Keep platform behavior defensive.
- Prefer optional chaining and fallbacks for platform-specific APIs. Only mock
  Linux-only APIs like `process.getuid()` when defensive coding is not enough.

## QA Flow Authoring

When creating or updating QA assets under `qa/`, read these first:

- `qa/README.md`
- `qa/AGENTS.md`
- `qa/flow-template.md`

QA flows must be executable by a QA engineer or visual agent that knows nothing
about the feature. Do not guess where UI lives. Derive every user-facing step
from the implementation: changed React components, Fuselage icons, i18n labels,
menu definitions, modal buttons, platform branches, tests, and helper pages.

Write the visible path directly in the flow step `Action` cell. Include screen
region, relative position, icon shape, nearby UI, visible labels after
interaction, and the visual confirmation state. If a label only appears as a
tooltip or after clicking a menu, describe the visible anchor first.

Do not create separate navigation sections or helper navigation files for basic
UI discovery. Validate QA packs with:

```sh
node qa/scripts/validate-flows.mjs qa/<pack>
node qa/scripts/export-qase-csv.mjs qa/<pack>
```

## Code Style

- Use React functional components with hooks.
- Redux actions follow FSA shape.
- File naming: camelCase for files, PascalCase for components.
- Prefer clear names over unnecessary comments.
- Prefer editing existing files over creating new abstractions unless the new
  abstraction removes real complexity or matches an existing pattern.

## Git And Verification

- Never commit or push without explicit user permission.
- Never commit directly to `master` or `dev`.
- Read-only git operations are fine.
- Show what will be committed before committing.
- Verify work with the narrowest meaningful checks first, then broader checks
  when risk or shared behavior justifies it.
- If GitNexus tooling is available, use the GitNexus section in `CLAUDE.md` for
  impact analysis and affected-scope checks. If it is unavailable, do not block
  progress solely on that tool; compensate with local code search, tests, and
  careful review.

## Writing

- Avoid subjective descriptors like "smart" or "excellent".
- Do not invent metrics, user counts, or time estimates.
- PR descriptions should use straightforward language focused on what changed
  and why.
