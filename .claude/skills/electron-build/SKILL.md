---
name: electron-build
description: Build and test the Electron app with proper worktree isolation
---

# Electron Build

Build, lint, and test the Rocket.Chat Electron app. Uses git worktrees to avoid disrupting the user's working directory.

## Arguments

- `platform` (optional): Target platform - `mac`, `win`, `linux`, or `all`. Defaults to current platform.
- `skip-worktree` (optional): If "true", build in the current directory instead of creating a worktree.

## Steps

### 1. Setup

If `skip-worktree` is not "true":
1. Create a worktree from the current branch:
   ```bash
   mkdir -p ../Rocket.Chat.Electron-worktrees
   git worktree add ../Rocket.Chat.Electron-worktrees/build-$(git branch --show-current) HEAD
   ```
2. Change to the worktree directory
3. Install dependencies: `yarn`

### 2. Lint

```bash
yarn lint
```

Fix any lint errors before proceeding.

### 3. Test

```bash
yarn test
```

All tests must pass before building.

### 4. Build

Build the app bundle:
```bash
yarn build
```

Then build platform packages if requested:

| Platform | Command |
|----------|---------|
| macOS | `yarn build-mac` |
| Windows | `yarn build-win` (includes `--x64 --ia32 --arm64`) |
| Linux | `yarn build-linux` |

### 5. Workspace Build

If changes touch `workspaces/desktop-release-action/`:
```bash
yarn workspaces:build
rm -rf workspaces/desktop-release-action/dist/dist
```

### 6. Cleanup

If a worktree was created:
```bash
git worktree remove ../Rocket.Chat.Electron-worktrees/build-$(git branch --show-current)
```

## Report

After completion, report:
- Lint status (pass/fail with error count)
- Test status (pass/fail with test count)
- Build status and output location
