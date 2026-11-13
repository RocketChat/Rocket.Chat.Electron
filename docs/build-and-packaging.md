# Build and packaging

How the app builds, where dependency patches go, and the packaging rules that
CI and the stores enforce. For the release flow itself, read
[release-process.md](release-process.md).

## Build

- Run `yarn` commands from the repository root. Do not run `yarn build` inside
  a workspace directory, because it writes an incorrect output structure. Use
  `yarn workspaces:build` to build all workspaces. In Claude Code
  sessions, the `guard-workspace-build.sh` hook denies a build inside a
  workspace directory.
- After you build `desktop-release-action`, delete the nested dist with
  `rm -rf workspaces/desktop-release-action/dist/dist`. The action needs only
  `workspaces/desktop-release-action/dist/index.js`. In Claude Code
  sessions, the `clean-action-dist.sh` hook deletes it.
- The dev and snapshot code paths of `desktop-release-action`
  (`releaseDevelopment` / `releaseSnapshot`) are dead on purpose. Do not
  rebuild its `dist/` bundle only to delete them.
- `app/` mirrors `src/public` through the `syncPublicAssets()` rollup plugin.
  A build purges from `app/` each file that you delete from `src/public`. The
  `yarn start` watcher rebuilds and relaunches the app when a `src/public`
  asset changes.
- `yarn build-assets` re-encodes every PNG and ICO that it touches, also when
  the source did not change. Commit only the assets whose SVG or component
  changed, and `git checkout --` the rest. Otherwise byte noise floods the
  diff.

## Dependency patches

The repository uses two patch systems. Put each patch in the system that
already owns its package:

- Yarn patch protocol: `.yarn/patches/`, configured in `package.json`. Today
  it patches `@ewsjs/xhr` and `app-builder-lib` (the macOS keychain fix from
  #3499).
- `patch-package`: `patches/`. Today it patches
  `@kayahr/jest-electron-runner`.

Never add an `@ewsjs/xhr` patch to `patches/`. That causes CI conflicts.

## Packaging

- Windows builds must include all three architectures: `x64`, `ia32` and
  `arm64`.
- Code signing uses Google Cloud KMS in two phases. This prevents MSI build
  failures from KMS CNG provider conflicts.

  1. Build the packages without signing (empty env vars).
  2. Sign the built packages with `jsign` and Google Cloud KMS.

  To rotate the credentials, read
  [RENEW_CI_CREDENTIALS.md](RENEW_CI_CREDENTIALS.md).

- `electron-builder.json`'s `mac.bundleVersion` (macOS `CFBundleVersion`) is
  independent from the `version` in `package.json`. Bump it on every release
  that ships to the App Store or gets notarized. Apple requires each
  submission's `CFBundleVersion` to be higher than the last one.
  - Format: `YYMM` plus a two-digit build counter that resets to `00` each
    month. Example: the first build shipped in November 2026 is `261100`, and
    the second build in the same month is `261101`. The one-digit counter
    stopped in October 2026, when one month needed more than ten builds.
  - The new value must be higher than the value on `dev`, on `master` and on
    every `release/X.Y.x` branch. Apple compares the values as integers.
  - Before you increment it, read the current value and the date of its last
    bump (`git log -p --follow -- electron-builder.json`). Do not guess.
