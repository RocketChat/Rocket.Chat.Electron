# Rocket.Chat Desktop

The Electron app for Rocket.Chat. Main-process code lives in
`src/<module>/main/`. Renderer code lives in the other `src/<module>/`
folders. The release GitHub Action lives in
`workspaces/desktop-release-action/`.

This file is the guide for every coding agent. It holds the core rules, the
traps and the doc index. An `AGENTS.md` file in a subdirectory adds rules for
the files under it.

Do not add a root `CLAUDE.md`. Claude Code 2.1.277 and later reads
`AGENTS.md` only when no `CLAUDE.md` exists. Do not add `CLAUDE.local.md` or
`.claude/CLAUDE.md` either, because they can also make Claude Code skip this
file. When a request says "add
this to CLAUDE.md", add it here or to the matching doc. If a tool creates a
`CLAUDE.md`, move its useful content here and remove it.

## Commands

```sh
yarn install && yarn start   # Dev mode
yarn build                   # Rollup compile to app/
yarn lint && yarn test       # Lint + test
yarn test <path>             # One spec (never a bare npx jest)
yarn workspaces:build        # Build all workspaces
```

Run `yarn` commands from the repository root. Never run `yarn build` inside a
workspace directory, because it writes an incorrect output structure.

## Code

- Write all new code in TypeScript strict mode, unless the request says
  otherwise. Follow the Rocket.Chat
  [TypeScript conventions](https://github.com/RocketChat/Rocket.Chat/blob/develop/docs/frontend/typescript-conventions.md):
  `import type` for an import used only as a type, `unknown` instead of
  `any`, and no class used only as a namespace.
- A comment states the **intent** of a function, never the mechanism. It
  never explains code that lives in another file.
  [docs/code-comments.md](docs/code-comments.md)
- Each pull request carries one classification and one concern, and it can be
  reverted alone. Put each fix and each enabling refactor in its own commit,
  below the feature. Do this also in a proof of concept. Title the pull request after what
  changes, not after how the code does it.
  [docs/change-organization.md](docs/change-organization.md)
- Keep every name that a preload exposes to the web client
  (`RocketChatDesktop`, `videoCallWindow` and their methods) backward
  compatible. A rename adds the new name and keeps the old name as an alias of
  the same object. Remove an old name only when no supported server version
  reads it, because users do not update the desktop app and the server
  together. Removing `videoCallWindow` in 4.18.0 broke leaving a call on
  Rocket.Chat 8.9.0.
- A hook that attaches a listener or an observer to a DOM node returns a
  callback ref, not a `RefObject` parameter
  ([why](https://github.com/RocketChat/Rocket.Chat/blob/develop/docs/frontend/dom-hooks.md)).

## Git

- Commit or push only when the user explicitly asks for it. "Fix this" does
  NOT mean "commit it". Show what you will commit before you commit.
- Never commit directly to `master`, `dev` or `release/X.Y.x`. Create a
  branch, test, and open a PR.
- Do not add AI attribution to a commit message, a PR title or a PR body.
  That includes `Co-Authored-By: Claude ...` and "Generated with" lines.
  Before a squash merge, remove such lines that other commits carry into the
  default message. Keep the `Co-authored-by` lines of real people.
  `.claude/settings.json` turns off the Claude Code trailer and session link
  for this repo.
- Work in a worktree, so that you do not disturb another working directory.
  To continue a branch, work in the worktree that has it, or check it out in a
  new one. Run `git status` there first. If it has uncommitted changes that
  are not yours, ask the user before you edit. Start a new branch from the
  remote `dev`, because a local `dev` can be stale:

  ```bash
  mkdir -p ../Rocket.Chat.Electron-worktrees
  git fetch origin dev
  git worktree add ../Rocket.Chat.Electron-worktrees/feature-name -b new-branch origin/dev
  ```

- Feature and fix PRs target `dev`. Squash-merge them. Merge a
  `dev`→`master` or `release/X.Y.x`→`master` PR with a true merge commit
  (`gh pr merge --merge`). NEVER squash it, because a squash forks the history
  permanently. Never back-merge `master` or a release branch into `dev`.
  [docs/development-and-release-flow.md](docs/development-and-release-flow.md)

## Traps

Each rule below prevents a mistake that already happened. Read the linked doc
before you work in that area.

- **Release tags**: create them only with `yarn release:tag`, never with a
  manual `git tag`. Treat a guard that fires as a real finding. Use `--force`,
  `--allow-unverified-ref` or `--allow-missing-translations` only when the
  release owner explicitly agrees.
  [docs/release-process.md](docs/release-process.md)
- **Dependency patches**: put each patch in the system that already owns its
  package (`.yarn/patches/` or `patches/`). Never add an `@ewsjs/xhr` patch to
  `patches/`. [docs/build-and-packaging.md](docs/build-and-packaging.md)
- **Windows builds** include all three architectures: `x64`, `ia32` and
  `arm64`. [docs/build-and-packaging.md](docs/build-and-packaging.md)
- **Specs**: the location of a spec decides which Jest project runs it, and a
  flat `src/<module>/*.spec.ts` file never runs. Make each spec pass on
  Windows, macOS and Linux. Do not change the Jest runner or transformer
  without reading the CI speed rules.
  [docs/testing.md](docs/testing.md)
- **UI changes** need a runtime check or a screenshot, because component
  tests cannot see paint. Use the `dev-app-verify` skill.
  [docs/testing.md](docs/testing.md)
- **Fuselage**: do not pass a `Box` styling prop (`margin*`, `width`,
  `flexGrow`, `color` and others) to a component other than `Box`. Fuselage
  1.0 rejects these props.
  [docs/desktop-ui-guidelines.md](docs/desktop-ui-guidelines.md)
- **Windows notifications**: never tie reply state to a `close` or dismiss
  signal. The Action Center card stays repliable after `close`.
  [docs/windows-notifications.md](docs/windows-notifications.md)
- **Web client events**: before you change code that reads them, run
  `yarn probe:web-signals`. Never read `Custom_Script_On_Logout`.
  [docs/testing.md](docs/testing.md#web-client-events)
- **Screen capture**: you cannot test it in a software-rendered VM.
  [docs/testing.md](docs/testing.md#screen-capture-needs-hardware-gl)
- **Startup**: judge the tray only after `yarn start` prints
  `waiting for changes`. [docs/startup-debugging.md](docs/startup-debugging.md)

## Documentation index

Read the doc that matches the task. Do not scan `docs/` wholesale.

- Specs, test setup and runtime UI checks:
  [docs/testing.md](docs/testing.md). Coverage:
  [docs/COVERAGE.md](docs/COVERAGE.md).
- Fuselage tokens, controls, SVG artwork, and the tray and presence icons:
  [docs/desktop-ui-guidelines.md](docs/desktop-ui-guidelines.md).
- QA assets under `qa/`: [qa/AGENTS.md](qa/AGENTS.md). A QA pass on a PR,
  branch or release candidate:
  [skills/desktop-qa-flows/SKILL.md](skills/desktop-qa-flows/SKILL.md).
- The build, `src/public` and `app/`, patches, `yarn build-assets`, code
  signing and `mac.bundleVersion`:
  [docs/build-and-packaging.md](docs/build-and-packaging.md).
- Release commands and guards:
  [docs/release-process.md](docs/release-process.md). The `ship-release`
  skill drives the whole flow. Expired CI credentials:
  [docs/RENEW_CI_CREDENTIALS.md](docs/RENEW_CI_CREDENTIALS.md). Alpha update
  tests: [docs/qa-alpha-update-testing.md](docs/qa-alpha-update-testing.md).
- Subsystems: [Windows notifications](docs/windows-notifications.md),
  [startup and boot](docs/startup-debugging.md),
  [supported versions](docs/supported-versions-flow.md),
  [video call window](docs/video-call-window-flow.md) (it links the other
  video call docs), and [Wayland and X11](docs/linux-display-server.md).
- Administrator guides:
  [enterprise deployment](docs/enterprise-deployment.md),
  [silent installation](docs/silent-installation.md),
  [corporate certificates](docs/corporate-certificate-configuration.md) and
  [Windows `tel:` associations](docs/windows-default-app-associations.md).
- A symptom or a past incident: read
  [docs/KNOWN_ISSUES.md](docs/KNOWN_ISSUES.md) first, then search the
  `docs/*postmortem*.md` files.
- The feature map: [docs/feature-map.md](docs/feature-map.md). It lists each
  user-visible feature by its English UI name, where it is, and the source
  that owns it. Read it to find a control that a request, a bug report or a
  QA flow names.

## Working principles

- **Understand before you change.** Treat working code as correct until you
  prove otherwise. If the change depends on a reason that the code, the history and
  the docs do not give, ask.
- **Prove that it works.** Run the tests and the type check
  (`npx tsc --noEmit`). Start with the narrowest meaningful check. Broaden the
  checks when the risk justifies it.
- **Diagnose before you iterate.** When an approach fails, find WHY before you
  try the next one.
- **Check libraries.** Read the official docs and the `.d.ts` files in
  `node_modules/`, such as Fuselage's `Theme.d.ts`. Never assume that a prop,
  token or API works.
- Prefer an edit to an existing file over a new abstraction. Add an
  abstraction only when it removes real complexity or matches an existing
  pattern.

## Writing

- Use measurable descriptions ("reduced memory usage by X%"), not subjective
  ones ("smart", "excellent").
- Never invent metrics, such as time spent or user counts. Use only numbers
  from real logs, error messages or documented sources.
- PR descriptions and commit bodies are public. Say what changed and why.
  Leave out Jira or Zoho Desk links, ticket text, customer names, support
  conversations and notes about local developer tools (code indexers, agent
  workflow, ledgers). You can put a bare Jira key at the end of the title or
  subject.
- Write instructions for agents (this file, nested `AGENTS.md` files, skills
  and the docs they link) in short active sentences: one instruction per
  sentence, and no semicolons.
- Write skills, agents, hooks and docs so that they work with no personal
  tool. Describe the action ("find every caller"). Name a personal tool only
  as an optional path, with a fallback.
