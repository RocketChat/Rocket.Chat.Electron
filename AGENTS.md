# Rocket.Chat Desktop

The Electron app for Rocket.Chat. Main-process code lives in
`src/<module>/main/`, renderer code in the other `src/<module>/` folders, and
the release GitHub Action in `workspaces/desktop-release-action/`.

This file is the guide for every coding agent: Claude Code, Codex, Cursor,
Hermes, GitHub agents and others. It holds the core rules, the traps that an
agent cannot know to look up, and the documentation index. The full rules of
each topic live in a doc under `docs/`. An `AGENTS.md` file in a subdirectory
adds rules for the files under it.

The repository has no `CLAUDE.md` on purpose. Claude Code 2.1.277 and later
reads `AGENTS.md` only when no `CLAUDE.md` exists, so a root `CLAUDE.md` hides
this file. Do not add `CLAUDE.local.md` or `.claude/CLAUDE.md` either, because
Claude Code can also skip this file when one of them exists. When a request says "add this to CLAUDE.md", add it here or to the
matching doc. If a tool creates a root `CLAUDE.md`, move its useful content
here and remove it. Claude-specific configuration lives in `.claude/` (skills,
agents, hooks, `settings.json`).

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

## Writing code here

- Write all new code in TypeScript strict mode, unless the request says
  otherwise. Follow the Rocket.Chat
  [TypeScript conventions](https://github.com/RocketChat/Rocket.Chat/blob/develop/docs/frontend/typescript-conventions.md):
  `import type` for an import used only as a type, `unknown` instead of
  `any`, and no class used only as a namespace.
- A comment states the **intent** of a function, never the mechanism. A
  comment never explains code that lives in another file. Full rules:
  [docs/code-comments.md](docs/code-comments.md).
- Each pull request carries one classification and one concern, and it can be
  reverted alone. Fixes and enabling refactors are their own commits, below
  the feature, also in a proof of concept. Title the pull request after what
  changes, not after how the code does it. Full rules:
  [docs/change-organization.md](docs/change-organization.md).
- Keep every name that a preload exposes to the web client
  (`RocketChatDesktop`, `videoCallWindow` and their methods) backward
  compatible. A rename adds the new name and keeps the old name as an alias of
  the same object. Remove an old name only when no supported server version
  reads it. Users do not update the desktop app and the server together.
  Removing `videoCallWindow` in 4.18.0 broke leaving a call on Rocket.Chat
  8.9.0 (DMV2-32).
- Use React functional components with hooks. A hook that attaches a listener
  or an observer to a DOM node returns a callback ref, not a `RefObject`
  parameter
  ([why](https://github.com/RocketChat/Rocket.Chat/blob/develop/docs/frontend/dom-hooks.md)).
- Redux actions follow the FSA (Flux Standard Action) shape.
- File names: camelCase for files, PascalCase for components.
- Prefer an edit to an existing file over a new abstraction. Add an
  abstraction only when it removes real complexity or matches an existing
  pattern.

## Git and worktrees

- Commit or push only when the user explicitly asks for it. "Fix this" does
  NOT mean "commit it". Show what you will commit before you commit.
- Never commit directly to `master`, `dev` or `release/X.Y.x`. Create a
  branch, test, and open a PR. Read-only git operations need no permission.
- Work in a worktree, so that you do not disturb another working directory.
  To continue an existing branch, check out that branch in the worktree. If
  another worktree already has that branch, work in that worktree. Run
  `git status` there first. If it has uncommitted changes that are not yours,
  ask the user before you edit. Start
  a new branch from the current remote `dev`, because a local `dev` can be
  stale:

  ```bash
  mkdir -p ../Rocket.Chat.Electron-worktrees
  git fetch origin dev
  git worktree add ../Rocket.Chat.Electron-worktrees/feature-name -b new-branch origin/dev
  ```

- `dev` is the default branch. Feature and fix PRs target `dev`, and they are
  squash-merged. A `dev`→`master` or `release/X.Y.x`→`master` PR is merged
  with a true merge commit (`gh pr merge --merge`). NEVER squash it, because a
  squash forks the history permanently. Never back-merge `master` or a release
  branch into `dev`. Details:
  [docs/development-and-release-flow.md](docs/development-and-release-flow.md).

## Traps

Each rule below prevents a mistake that already happened. Read the linked doc
before you work in that area.

- **Release tags**: create them only with `yarn release:tag`, never with a
  manual `git tag`. Treat a guard that fires as a real finding. Use `--force`,
  `--allow-unverified-ref` or `--allow-missing-translations` only when the
  release owner explicitly agrees. The translation guard blocks a release when
  a new English key has no value in a loaded locale.
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
- **Screen capture** cannot be tested in a software-rendered VM.
  [docs/testing.md](docs/testing.md#screen-capture-needs-hardware-gl)
- **Startup**: judge the tray only after `yarn start` prints
  `waiting for changes`. [docs/startup-debugging.md](docs/startup-debugging.md)

## Documentation index

Read the doc that matches the task. Do not scan `docs/` wholesale.

### Code and changes

- [docs/code-comments.md](docs/code-comments.md) — what a comment may say,
  and where the reasoning goes when it is not a comment.
- [docs/change-organization.md](docs/change-organization.md) — one concern per
  pull request, PR titles, fixes → refactors → feature as a stack, and
  rebasing a stack after a squash merge.
- [docs/testing.md](docs/testing.md) — where specs live, how to run them,
  cross-platform specs, runtime UI checks, the web client events, and the
  Jest and CI speed rules. Read it before you add a spec or change the test
  setup.
- [docs/COVERAGE.md](docs/COVERAGE.md) — how coverage is measured, the
  coverage history, and spec gotchas.
- [docs/desktop-ui-guidelines.md](docs/desktop-ui-guidelines.md) — Fuselage
  tokens, geometry and the 1.0 styling-prop rule, tab bar and titlebar
  controls, SVG pitfalls, and the tray, menu-bar and presence icons. Read it
  before you style a control, draw an SVG or change an icon.
- [qa/AGENTS.md](qa/AGENTS.md) — read it before you create or change a QA
  asset under `qa/`. For a QA pass on a PR, branch or release candidate,
  follow [skills/desktop-qa-flows/SKILL.md](skills/desktop-qa-flows/SKILL.md).

### Build and release

- [docs/build-and-packaging.md](docs/build-and-packaging.md) — the build,
  `src/public` and `app/`, the two patch systems, `yarn build-assets`, code
  signing, and `mac.bundleVersion`.
- [docs/development-and-release-flow.md](docs/development-and-release-flow.md)
  — branch roles (`dev`, `master`, `release/X.Y.x`), and how a change reaches
  a release.
- [docs/release-process.md](docs/release-process.md) — the exact release
  commands, the `yarn release:tag` guards, the alpha, stable and patch
  procedures, the release workflow, and channel switching. The `ship-release`
  skill drives the whole flow.
- [docs/RENEW_CI_CREDENTIALS.md](docs/RENEW_CI_CREDENTIALS.md) — rotating
  expired publishing credentials of the build workflows.
- [docs/qa-alpha-update-testing.md](docs/qa-alpha-update-testing.md) —
  testing the alpha update flow.

### Subsystems

- [docs/windows-notifications.md](docs/windows-notifications.md) — Windows
  toast and Action Center behavior, and the rules that keep quick replies
  working.
- [docs/startup-debugging.md](docs/startup-debugging.md) — dev mode
  relaunches, the webview boot signals, the boot wedge and render storms.
- [docs/supported-versions-flow.md](docs/supported-versions-flow.md) — how
  the app fetches, caches and applies server version support data.
- [docs/video-call-window-flow.md](docs/video-call-window-flow.md) — the
  video call window, and how the other video call docs fit together:
  [management](docs/video-call-window-management.md),
  [screen sharing](docs/video-call-screen-sharing.md) and the
  [Windows Graphics Capture stall](docs/video-call-window-wgc-limitations.md).
- [docs/linux-display-server.md](docs/linux-display-server.md) — Wayland and
  X11 detection and fallback on Linux.

### Deployment guides for administrators

- [docs/enterprise-deployment.md](docs/enterprise-deployment.md) — installer
  choice, and deployment with Active Directory, SCCM/MECM, Intune and Group
  Policy.
- [docs/silent-installation.md](docs/silent-installation.md) — unattended
  installation on each supported OS.
- [docs/corporate-certificate-configuration.md](docs/corporate-certificate-configuration.md)
  — servers with certificates that the system does not trust by default.
- [docs/windows-default-app-associations.md](docs/windows-default-app-associations.md)
  — making the app the `tel:` and `callto:` handler on Windows fleets.

### Incidents

- [docs/KNOWN_ISSUES.md](docs/KNOWN_ISSUES.md) — documented platform and
  library traps, with status and workarounds.
- [docs/postmortem-webview-boot-wedge.md](docs/postmortem-webview-boot-wedge.md)
  — a workspace webview that never finishes booting.
- [docs/postmortem-notification-quick-reply-sup-1097.md](docs/postmortem-notification-quick-reply-sup-1097.md)
  — Windows quick replies that never reached the room.
- [docs/postmortem-supported-versions-race.md](docs/postmortem-supported-versions-race.md)
  — the "unsupported version" screen on the first launch after an update.
- [docs/postmortem-screen-picker-sandbox-detection.md](docs/postmortem-screen-picker-sandbox-detection.md)
  and
  [docs/postmortem-screen-picker-startup-enumeration.md](docs/postmortem-screen-picker-startup-enumeration.md)
  — the Linux screen-share picker that opened at each launch.
- [docs/linux-wayland-bug-postmortem.md](docs/linux-wayland-bug-postmortem.md)
  — the crash when the environment suggests Wayland but no compositor runs.
- [docs/postmortem-msi-disable-auto-updates.md](docs/postmortem-msi-disable-auto-updates.md)
  — the `DISABLE_AUTO_UPDATES=1` MSI property for SCCM/MECM and Intune.
- [docs/postmortem-validate-pr-ci-speed.md](docs/postmortem-validate-pr-ci-speed.md)
  — `validate-pr` from 34 to 5 minutes.

## Working principles

- **Understand before you change.** Find out WHY the code is written that way.
  Working code is correct until proven otherwise. If the reason is not in the
  code, the history or the docs, and the change depends on it, ask.
- **Check your work.** Run the tests and the type check (`npx tsc --noEmit`),
  and show that the change works. Start with the narrowest meaningful check.
  Broaden the checks when the risk or the shared behavior justifies it. Never
  mark a task done before you prove that it works.
- **Diagnose before you iterate.** When an approach fails, find WHY before you
  try the next one. Do not cycle blindly through 3 or more approaches.
- **Check libraries.** Read the official docs and the `.d.ts` files in
  `node_modules/`, such as Fuselage's `Theme.d.ts` for color tokens. Never
  assume that a prop, token or API works.

## Writing

- Do not use subjective descriptors ("smart", "excellent", "dumb"). Use
  measurable descriptions: "reduced memory usage", "improved by X%".
- Never invent metrics: no estimated time spent, no speculated user counts.
  Use only numbers from real logs, error messages or documented sources.
- PR descriptions use straightforward language, and focus on what changed and
  why.
- PR descriptions and commit bodies are public. Do not include internal
  references: Jira or Zoho Desk links and ticket text, customer names, support
  conversations. Do not include notes about local developer tools either
  (code indexers, agent workflow, ledgers). A bare Jira key at the end of the title
  or subject is the accepted convention. Everything else about the ticket
  stays internal.
- Write instructions for agents (this file, nested `AGENTS.md` files, skills,
  and the docs they link) in short active sentences: one instruction per
  sentence, and no semicolons.
- Write skills, agents, hooks and docs so that they work with no personal
  tool. A contributor may not have your MCP servers, plugins, agents or
  skills. Describe the action ("find every caller", "run it in the
  background"). Name a personal tool only as an optional path, with a
  fallback.
