---
name: electron-build
description: Lint, test and build the Electron app in a separate git worktree, so the working directory of the user stays untouched. Use when asked to build the app, or to run the full lint, test and build gate for mac, win or linux.
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

1. Create a worktree from the current branch. The worktree uses `HEAD`, so the build does not include uncommitted edits. If the user wants those edits in the build, ask them to commit first, or use `skip-worktree`.
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

Record the commit that the build used: run `git rev-parse --short HEAD` in the build directory. Do this before you remove a worktree, because the command cannot run there after the removal.

If you created a worktree:

```bash
git worktree remove ../Rocket.Chat.Electron-worktrees/build-$(git branch --show-current)
```

## Report

When the build ends, report:

- Lint status (pass/fail with error count)
- Test status (pass/fail with test count)
- Build status and output location
- The commit that the build used (recorded in step 6)
