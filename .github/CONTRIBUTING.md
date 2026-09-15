# Contributing to Rocket.Chat Desktop

Thanks for taking the time to contribute.

This file is the contributor on-ramp for
[Rocket.Chat.Electron](https://github.com/RocketChat/Rocket.Chat.Electron).
Coding conventions, the branch model, release tagging, UI rules, and test
discovery are in [AGENTS.md](../AGENTS.md) — read that; do not copy it
here.

If you want a feature, have a bug to fix, or just want to get involved,
[open an issue](https://github.com/RocketChat/Rocket.Chat.Electron/issues)
and start a conversation. We'll help as much as we can, though we may not
always respond right away.

## Prerequisites

- [Git](https://git-scm.com/book/en/v2/Getting-Started-Installing-Git)
- [Node.js](https://nodejs.org) **24.11.1** (`engines.node` and CI
  `node-version` in `.github/workflows/`; Volta pin in `package.json`
  matches this)
- [Yarn](https://yarnpkg.com/) **4.6** (`packageManager` / `volta.yarn`
  are `4.6.0`)

## Setup

```sh
git clone https://github.com/RocketChat/Rocket.Chat.Electron.git
cd Rocket.Chat.Electron
yarn
yarn start
```

`yarn start` runs the Rollup watch build and launches Electron with the
main-process inspector on port **9339**. See
[docs/troubleshooting.md](../docs/troubleshooting.md).

## Common commands

| Command | Purpose |
| ------- | ------- |
| `yarn` | Install dependencies |
| `yarn start` | Dev mode (watch + app) |
| `yarn lint` | ESLint + `tsc --noEmit` |
| `yarn test` | Jest (Electron runner) |
| `yarn test:coverage` | Jest with coverage |
| `yarn build-mac` / `yarn build-win` / `yarn build-linux` | Local installers only (`electron-builder --publish never`) |

Run these from the **repository root**. Do not run `yarn build` inside a
workspace directory.

**Do not run `yarn release`.** That script calls `electron-builder
--publish onTagOrDraft` and is not how Desktop is shipped. Official
releases are tag-driven; see [docs/release-process.md](../docs/release-process.md).

## Tests

- Renderer specs: `*.spec.ts` / `*.spec.tsx` in a **nested** path under
  `src/<module>/...` (for example `src/foo/bar/baz.spec.ts` or
  `src/foo/renderer.spec.ts`). A flat `src/<module>/*.spec.ts` is not
  discovered by the current `testMatch` in `jest.config.js`.
- Main-process specs: `*.main.spec.ts` under `src/<module>/main/`, or a
  file named `main.spec.ts` (the main Jest project matches
  `src/*/main/**` and `src/**/main.(spec|test).*`).

Unsure whether a new file is picked up? Run:

```sh
yarn test --listTests --runTestsByPath <file>
```

## Branching model

Pull requests target **`dev`**, the default branch. `master` holds only
released code. `release/X.Y.x` branches are patch lines for a shipped
stable version. Details:
[docs/development-and-release-flow.md](../docs/development-and-release-flow.md).

## Coding standards

Most style is enforced by `.editorconfig` and ESLint. Before opening a
PR:

```sh
yarn lint
yarn test
```

## Documentation

- [docs/README.md](../docs/README.md) — grouped index
- [docs/troubleshooting.md](../docs/troubleshooting.md) — Log Viewer and logs
- [AGENTS.md](../AGENTS.md) — full project guide for agents and humans

## Contributor License Agreement

This repository uses CLA-assistant on
**RocketChat/Rocket.Chat.Electron** (not the Rocket.Chat server repo).
Please review and sign the [CLA](https://cla-assistant.io/RocketChat/Rocket.Chat.Electron).
