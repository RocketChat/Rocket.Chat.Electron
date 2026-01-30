# Development Guidelines for Rocket.Chat.Electron

## Quick Reference

```bash
# Development
yarn install && yarn start

# Testing
yarn lint && yarn test

# Build workspaces (ALWAYS use root commands)
yarn workspaces:build

# Windows build (all architectures)
yarn electron-builder --x64 --ia32 --arm64 --win nsis
```

---

## Building the Project

### Workspace Commands (IMPORTANT)

**ALWAYS** use root package.json commands for workspaces:

```bash
yarn workspaces:build  # Builds all workspaces including desktop-release-action
```

**DO NOT** run `yarn build` directly in workspace directories - creates incorrect output structures.

### After Building desktop-release-action

Remove the nested dist folder created by ncc bundler:

```bash
rm -rf workspaces/desktop-release-action/dist/dist
```

The action only needs `workspaces/desktop-release-action/dist/index.js`.

### Windows Build Architectures

Always include all architectures:

- x64 (64-bit)
- ia32 (32-bit)
- arm64 (ARM)

### Code Signing

Windows packages use Google Cloud KMS. Build happens in two phases:

1. Build packages without signing (empty environment variables)
2. Sign built packages using jsign with Google Cloud KMS

This prevents MSI build failures from KMS CNG provider conflicts.

### Patching npm Packages (CRITICAL)

This project uses **TWO different patching mechanisms** - do NOT confuse them:

| Mechanism               | Location         | Used For                                  |
| ----------------------- | ---------------- | ----------------------------------------- |
| **Yarn patch protocol** | `.yarn/patches/` | `@ewsjs/xhr` (configured in package.json) |
| **patch-package**       | `patches/`       | `@kayahr/jest-electron-runner`            |

**NEVER add `@ewsjs/xhr` patches to `patches/`** - it's already patched by Yarn. Adding a patch-package patch causes CI failures due to conflicts.

The `patches-src/` folder contains reference TypeScript sources but is NOT automatically applied.

---

## Architecture Overview

Electron desktop application built with TypeScript and React.

### Entry Points (compiled by Rollup)

| File                | Process  | Purpose                                         |
| ------------------- | -------- | ----------------------------------------------- |
| `src/main.ts`       | Main     | Orchestrates the application                    |
| `src/rootWindow.ts` | Renderer | Main window UI                                  |
| `src/preload.ts`    | Preload  | Privileged API bridge between main and renderer |

### Core Technologies

- **Electron 37.2.4** - Desktop framework
- **TypeScript 5.7.3** - Type-safe JavaScript
- **React 18.3.1** - UI components
- **Redux 5.0.1** - State management
- **Rollup** - Build bundler
- **Jest** - Testing (with Electron runner)

### Key Directories

| Directory              | Purpose                        |
| ---------------------- | ------------------------------ |
| `src/main/`            | Main process code              |
| `src/ui/`              | React components and UI logic  |
| `src/preload/`         | Preload scripts for secure IPC |
| `src/servers/`         | Server connection management   |
| `src/downloads/`       | Download handling              |
| `src/notifications/`   | Notification system            |
| `src/videoCallWindow/` | Video call window management   |
| `src/store/`           | Redux store configuration      |
| `src/i18n/`            | Internationalization resources |

### State Management

Redux with modular reducers. State syncs between main and renderer via IPC channels in `src/ipc/`.

### Configuration Files

| File                    | Purpose                                              |
| ----------------------- | ---------------------------------------------------- |
| `rollup.config.mjs`     | Build configuration                                  |
| `electron-builder.json` | Packager configuration                               |
| `tsconfig.json`         | TypeScript options                                   |
| `.eslintrc.json`        | ESLint rules (extends `@rocket.chat/eslint-config`)  |
| `jest.config.js`        | Test configuration (separate main/renderer projects) |
| `servers.json`          | Default server connections                           |

---

## Code Style and Conventions

- TypeScript strict mode enabled
- React functional components with hooks
- Redux actions follow FSA (Flux Standard Action) pattern
- File naming: camelCase for files, PascalCase for components
- All code must pass ESLint and TypeScript checks
- Prefer editing existing files over creating new ones
- **No unnecessary comments** - self-documenting code through clear naming
- Only comment complex business logic or non-obvious decisions

---

## UI Development - Fuselage Design System

**MANDATORY: Use Fuselage components** for all UI work.

- Storybook: https://rocketchat.github.io/fuselage
- Repository: https://github.com/RocketChat/fuselage
- Only create custom components when Fuselage doesn't provide what's needed
- Check `Theme.d.ts` for valid color tokens
- Import from `@rocket.chat/fuselage`
- Reference https://github.com/RocketChat/Rocket.Chat for usage patterns

---

## Testing

### Test Files

- `*.spec.ts` - Renderer process tests
- `*.main.spec.ts` - Main process tests

Uses `@kayahr/jest-electron-runner` for Electron environment simulation.

### Cross-Platform Compatibility (CRITICAL)

Tests run on Windows, macOS, AND Linux CI.

**Primary Pattern: Defensive Coding**

Use optional chaining with fallbacks for Linux-only APIs:

```typescript
// PREFERRED - works on all platforms without mocks
const uid = process.getuid?.() ?? 1000;
const isRoot = process.getuid?.() === 0;
const runtimeDir =
  process.env.XDG_RUNTIME_DIR || `/run/user/${process.getuid?.() ?? 1000}`;
```

**Fallback Pattern: Mocking** (only when defensive coding isn't possible)

```typescript
const originalPlatform = process.platform;

beforeEach(() => {
  Object.defineProperty(process, 'platform', {
    value: 'linux',
    configurable: true,
  });
  process.env.XDG_RUNTIME_DIR = '/run/user/1000';
});

afterEach(() => {
  Object.defineProperty(process, 'platform', {
    value: originalPlatform,
    configurable: true,
  });
});
```

**Linux-only APIs requiring defensive coding:**

- `process.getuid()` / `process.getgid()` / `process.geteuid()` / `process.getegid()`

---

## Git Guidelines

### Branch Workflow

**NEVER** commit directly to master/main. Always:

1. Create a new branch
2. Test thoroughly
3. Create a Pull Request
4. Wait for review and approval

### Git Operations (CRITICAL)

- **NEVER commit without explicit user permission** - even if work is complete, wait for user to say "commit"
- **NEVER** merge, rebase, or push unless explicitly requested
- Read operations (status, diff, log, show) are allowed
- Show what will be committed before committing
- Wait for user confirmation before any write operation

### Git Worktrees for Agents

Agents should use worktrees to avoid disrupting user's work:

```bash
# Create worktree (branch from master)
mkdir -p ../Rocket.Chat.Electron-worktrees
git worktree add ../Rocket.Chat.Electron-worktrees/feature-name -b new-branch master
cd ../Rocket.Chat.Electron-worktrees/feature-name
yarn

# List worktrees
git worktree list

# Clean up when done
git worktree remove ../Rocket.Chat.Electron-worktrees/feature-name
```

Each worktree has its own working directory, branch, build outputs, and node_modules.

---

## Library and Framework Usage

- **Always verify before using** - check official docs and type definitions
- For TypeScript: check `.d.ts` files in `node_modules/@package-name/dist/`
- Never assume prop values, tokens, or API endpoints work without verification

---

## Documentation Guidelines

- Check `docs/` folder before working on features
- Update existing docs when changing documented features
- Create docs for new features (flow diagrams, architecture, examples)
- Use simple language - explain like talking to a colleague
- Avoid complex words: "advanced" not "sophisticated", "use" not "utilize"

### Knowledge Management (IMPORTANT)

**When new knowledge is gained during development**, update documentation:

1. **Root `AGENTS.md`** - Project-wide patterns, conventions, gotchas
2. **Folder-level `AGENTS.md`** - Module-specific knowledge (e.g., `src/outlookCalendar/AGENTS.md`)
3. **`docs/` folder** - Feature documentation, architecture diagrams, flow explanations

**What to document:**

- Bug patterns and their solutions
- Non-obvious architectural decisions
- Integration gotchas (e.g., "preload.ts runs in renderer, can't share globals with main")
- Critical warnings (e.g., "verboseLog() must call console.log(), not itself")
- Patterns that took time to figure out

**Hierarchy:**

```
AGENTS.md (root)           → Project-wide guidelines
├── src/module/AGENTS.md   → Module-specific knowledge
├── patches-src/AGENTS.md  → Patch-specific knowledge
└── docs/                  → Feature documentation
```

This ensures future agents don't repeat the same investigations.

---

## Communication Guidelines

- Avoid subjective descriptors: "smart", "excellent", "dumb", "poor"
- Don't call existing code "slow" - only say "faster" when measurably true
- Use measurable improvements: "reduced memory usage", "improved by X%"
- Stay neutral - implement and describe, don't evaluate
- PR descriptions: straightforward language, no fancy words

---

## Writing Technical Documentation

### Never Invent Metrics

**NEVER:**

- Estimate time spent ("3 days debugging")
- Speculate user counts ("500+ users affected")
- Create arbitrary metrics without evidence
- Include time tracking unless explicitly requested

**ONLY include:**

- Numbers from actual logs or error messages
- Metrics documented in issues/PRs
- Verifiable repository data

**Examples:**

- Wrong: "Spent 3 days debugging" → Correct: "Multiple debugging approaches attempted"
- Wrong: "Affected 500+ users" → Correct: "Multiple community issues reported"

### Post-Mortem Documents

Start with "The Solution That Actually Worked":

- **Problem**: Core issue in one sentence
- **Solution**: Code/approach that fixed it
- **Result**: Measurable improvement
- **PR**: Link

Structure:

1. The Solution That Actually Worked
2. Executive Summary
3. The Problem
4. Root Cause Analysis
5. Investigation Timeline
6. The Solution (detailed)
7. Critical Discoveries
8. Metrics & Impact
9. Lessons Learned
10. Future Recommendations

Focus on:

- Qualitative descriptions over fake quantitative data
- Actual configuration values from code
- Observable behaviors rather than percentages
- Root causes, not symptoms
