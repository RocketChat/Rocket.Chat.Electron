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
- Renderer specs must live in a Jest-matched nested path, e.g. `src/<module>/<subdir>/*.spec.ts(x)` or `src/<module>/renderer.spec.ts(x)`. Flat `src/<module>/*.spec.ts` files are not discovered by current `testMatch`; verify new specs with `yarn test --listTests --runTestsByPath <file>`.
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

<!-- gitnexus:start -->
# GitNexus — Code Intelligence

This project is indexed by GitNexus as **Rocket.Chat.Electron** (4593 symbols, 7029 relationships, 103 execution flows). Use the GitNexus MCP tools to understand code, assess impact, and navigate safely.

> If any GitNexus tool warns the index is stale, run `npx gitnexus analyze` in terminal first.

## Always Do

- **MUST run impact analysis before editing any symbol.** Before modifying a function, class, or method, run `gitnexus_impact({target: "symbolName", direction: "upstream"})` and report the blast radius (direct callers, affected processes, risk level) to the user.
- **MUST run `gitnexus_detect_changes()` before committing** to verify your changes only affect expected symbols and execution flows.
- **MUST warn the user** if impact analysis returns HIGH or CRITICAL risk before proceeding with edits.
- When exploring unfamiliar code, use `gitnexus_query({query: "concept"})` to find execution flows instead of grepping. It returns process-grouped results ranked by relevance.
- When you need full context on a specific symbol — callers, callees, which execution flows it participates in — use `gitnexus_context({name: "symbolName"})`.

## Never Do

- NEVER edit a function, class, or method without first running `gitnexus_impact` on it.
- NEVER ignore HIGH or CRITICAL risk warnings from impact analysis.
- NEVER rename symbols with find-and-replace — use `gitnexus_rename` which understands the call graph.
- NEVER commit changes without running `gitnexus_detect_changes()` to check affected scope.

## Resources

| Resource | Use for |
|----------|---------|
| `gitnexus://repo/Rocket.Chat.Electron/context` | Codebase overview, check index freshness |
| `gitnexus://repo/Rocket.Chat.Electron/clusters` | All functional areas |
| `gitnexus://repo/Rocket.Chat.Electron/processes` | All execution flows |
| `gitnexus://repo/Rocket.Chat.Electron/process/{name}` | Step-by-step execution trace |

## CLI

| Task | Read this skill file |
|------|---------------------|
| Understand architecture / "How does X work?" | `.claude/skills/gitnexus/gitnexus-exploring/SKILL.md` |
| Blast radius / "What breaks if I change X?" | `.claude/skills/gitnexus/gitnexus-impact-analysis/SKILL.md` |
| Trace bugs / "Why is X failing?" | `.claude/skills/gitnexus/gitnexus-debugging/SKILL.md` |
| Rename / extract / split / refactor | `.claude/skills/gitnexus/gitnexus-refactoring/SKILL.md` |
| Tools, resources, schema reference | `.claude/skills/gitnexus/gitnexus-guide/SKILL.md` |
| Index, status, clean, wiki CLI commands | `.claude/skills/gitnexus/gitnexus-cli/SKILL.md` |

<!-- gitnexus:end -->
