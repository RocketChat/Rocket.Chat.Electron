# Claude Instructions

## Language

TypeScript codebase. Use TypeScript for all new code unless explicitly told otherwise.

## Build & Workspaces

```bash
yarn install && yarn start   # Dev mode
yarn build                   # Rollup compile to app/
yarn lint && yarn test       # Lint + test
yarn workspaces:build        # Build all workspaces
```

**NEVER** run `yarn build` directly in workspace directories — creates incorrect output structures. Always use root commands.

After building `desktop-release-action`, remove the nested dist: `rm -rf workspaces/desktop-release-action/dist/dist` — the action only needs `workspaces/desktop-release-action/dist/index.js`.

## Patching npm Packages (CRITICAL)

Two different patching mechanisms — do NOT confuse them:

| Mechanism | Location | Used For |
|-----------|----------|----------|
| **Yarn patch protocol** | `.yarn/patches/` | `@ewsjs/xhr` (configured in package.json) |
| **patch-package** | `patches/` | `@kayahr/jest-electron-runner` |

**NEVER add `@ewsjs/xhr` patches to `patches/`** — causes CI failures due to conflicts.

## Windows Builds

Always include all architectures: x64, ia32, arm64.

Code signing uses Google Cloud KMS in two phases:
1. Build packages without signing (empty env vars)
2. Sign built packages using jsign with Google Cloud KMS

This prevents MSI build failures from KMS CNG provider conflicts.

## UI — Fuselage Design System

**MANDATORY: Use Fuselage components** for all UI work. Only create custom components when Fuselage doesn't provide what's needed.

- Import from `@rocket.chat/fuselage`
- Check `Theme.d.ts` for valid color tokens
- Reference: [Fuselage Storybook](https://rocketchat.github.io/fuselage) and [Rocket.Chat main repo](https://github.com/RocketChat/Rocket.Chat) for usage patterns

## Testing

- `*.spec.ts` — Renderer process tests
- `*.main.spec.ts` — Main process tests
- Uses `@kayahr/jest-electron-runner` for Electron environment simulation
- Tests run on Windows, macOS, AND Linux CI — always verify cross-platform

### Cross-Platform Compatibility

Use optional chaining with fallbacks for platform-specific APIs:

```typescript
// PREFERRED — works on all platforms without mocks
const uid = process.getuid?.() ?? 1000;
const runtimeDir = process.env.XDG_RUNTIME_DIR || `/run/user/${process.getuid?.() ?? 1000}`;
```

Only mock when defensive coding isn't possible. Linux-only APIs requiring this: `process.getuid()`, `process.getgid()`, `process.geteuid()`, `process.getegid()`.

## Code Style

- TypeScript strict mode
- React functional components with hooks
- Redux actions follow FSA (Flux Standard Action) pattern
- File naming: camelCase for files, PascalCase for components
- No unnecessary comments — self-documenting code through clear naming
- Prefer editing existing files over creating new ones

## Git Guidelines

- **NEVER** commit or push without explicit user permission — "fix this" does NOT mean "commit it"
- **NEVER** commit directly to master or dev — create a branch, test, open a PR
- Read operations (status, diff, log) are always fine
- Show what will be committed before committing

### Worktrees

Use worktrees to avoid disrupting the user's working directory:

```bash
mkdir -p ../Rocket.Chat.Electron-worktrees
git worktree add ../Rocket.Chat.Electron-worktrees/feature-name -b new-branch master
```

## Working Principles

- **Understand before changing** — understand WHY code is written that way. Working code is correct until proven otherwise. If unsure, ASK.
- **Verify your work** — run tests, check types (`npx tsc --noEmit`), demonstrate correctness. Never mark a task done without proving it works.
- **Diagnose before iterating** — when approaches fail, analyze WHY before trying the next one. Don't cycle through 3+ approaches blindly.
- **Always verify libraries** — check official docs and `.d.ts` files in `node_modules/`. Never assume props, tokens, or APIs work without verification.

## Writing Standards

- Avoid subjective descriptors ("smart", "excellent", "dumb")
- Use measurable descriptions: "reduced memory usage", "improved by X%"
- **Never invent metrics** — no estimated time spent, no speculated user counts. Only include numbers from actual logs, error messages, or documented sources.
- PR descriptions: straightforward language, focus on what changed and why
