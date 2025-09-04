# Claude Development Guidelines for Rocket.Chat.Electron

## Building the Project

### IMPORTANT: Always use root workspace commands

When building workspaces (like desktop-release-action), **ALWAYS** use the root package.json commands:

```bash
# Build all workspaces (including desktop-release-action)
yarn workspaces:build

# This builds both the main app and the desktop-release-action
```

**DO NOT** run `yarn build` directly in workspace directories as it may create incorrect output structures.

### After Building desktop-release-action

The ncc bundler creates a nested `dist/dist` folder that should be removed:

```bash
rm -rf workspaces/desktop-release-action/dist/dist
```

The action only needs `workspaces/desktop-release-action/dist/index.js` to function correctly.

## Committing Changes

**NEVER** commit directly to master/main branch. Always:
1. Create a new branch for changes
2. Test thoroughly
3. Create a Pull Request (PR)
4. Wait for user review and approval

## Testing Commands

Before running tests, ensure all dependencies are installed:

```bash
yarn install
yarn lint
yarn test
```

## Windows Build Architectures

When modifying Windows build commands, ensure all architectures are included:
- x64 (64-bit)
- ia32 (32-bit)
- arm64 (ARM)

Example:
```bash
yarn electron-builder --x64 --ia32 --arm64 --win nsis
```

## Code Signing

Windows packages use Google Cloud KMS for signing. The signing happens in two phases:
1. Build packages without signing (with empty environment variables)
2. Sign the built packages using jsign with Google Cloud KMS

This prevents MSI build failures caused by KMS CNG provider installation conflicts.