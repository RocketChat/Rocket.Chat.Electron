---
name: electron-build
description: Build and test the Electron app with proper worktree isolation
---

# Electron Build

Build, lint, and test the Rocket.Chat Electron app. This skill uses git
worktrees to protect the user's working directory.

## Arguments

- `platform` (optional): Target platform - `mac`, `win`, `linux`, or `all`. Defaults to current platform.
- `skip-worktree` (optional): If "true", build in the current directory. Do not create a worktree.

## Steps

### 1. Setup

If `skip-worktree` is not "true":

1. Create a worktree from the current branch:
   ```bash
   mkdir -p ../Rocket.Chat.Electron-worktrees
   git worktree add ../Rocket.Chat.Electron-worktrees/build-$(git branch --show-current) HEAD
   ```
2. Change to the worktree directory.
3. Install dependencies: `yarn`

### 2. Lint

```bash
yarn lint
```

`yarn lint` runs ESLint and `tsc --noEmit`. Fix each lint and type error
before you continue.

### 3. Test

```bash
yarn test
```

All tests must pass before you build.

### 4. Build

Build the app bundle:

```bash
yarn build
```

If the user requests platform packages, build them:

| Platform | Command                                                               |
| -------- | --------------------------------------------------------------------- |
| macOS    | `yarn build-mac`                                                      |
| Windows  | `yarn build-win` (`electron-builder.json` builds x64, ia32 and arm64) |
| Linux    | `yarn build-linux`                                                    |

### 5. Workspace Build

If the changes touch `workspaces/desktop-release-action/`:

```bash
yarn workspaces:build
rm -rf workspaces/desktop-release-action/dist/dist
```

### 6. Cleanup

If you created a worktree:

```bash
git worktree remove ../Rocket.Chat.Electron-worktrees/build-$(git branch --show-current)
```

## Report

When the build ends, report:

- Lint status (pass/fail with error count)
- Test status (pass/fail with test count)
- Build status and output location
