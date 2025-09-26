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

## CRITICAL: Never Invent Metrics or Time Estimates

When creating any technical documentation, retrospectives, or reports:

### NEVER:
- Invent or estimate time spent (e.g., "3 days debugging", "2 weeks of effort")
- Speculate on user counts affected (e.g., "500+ users", "thousands of developers")
- Create arbitrary metrics without concrete evidence
- Include time tracking unless explicitly requested by the user
- Guess at durations based on PR dates or commit history

### ONLY Include:
- Numbers that come directly from actual logs or error messages
- Metrics that are explicitly documented in issues/PRs
- Data that can be verified from the repository
- Actual commit timestamps when specifically requested
- Time tracking ONLY when the user explicitly asks for it to be added

### Examples:
- ❌ Wrong: "Spent 3 days debugging this issue"
- ✅ Correct: "Multiple debugging approaches attempted"

- ❌ Wrong: "This took 2 weeks to resolve"
- ✅ Correct: "Complex investigation requiring systematic version testing"

- ❌ Wrong: "Affected 500+ users"
- ✅ Correct: "Multiple community issues reported" or "Enterprise customer affected"

### Writing Metrics & Impact Sections

When documenting metrics, follow this approach:

#### ❌ AVOID Invented Metrics:
```markdown
- IPC Success Rate: 50% on slow machines
- After System Load: 10% success rate  
- Recovery Time: 2-4 seconds average
- Max Recovery Time: 10 seconds
- Support Tickets: Multiple per day → Zero
- Fallback UI Shown: <0.1% of cases
```

#### ✅ USE Verifiable Information:
```markdown
### Before Implementation
- **Issue Pattern**: Intermittent failures on slower hardware
- **System Load Impact**: Failures increased significantly under load
- **Recovery Method**: Required manual app restart
- **Customer Impact**: Enterprise customer severely affected

### After Implementation
- **Recovery Method**: Automatic retry with exponential backoff
- **System Load Impact**: Maintains stability even under resource pressure
- **Customer Impact**: Issue completely resolved

### Key Implementation Parameters (from actual code)
- **Handshake Retries**: 3 attempts configured
- **URL Request Retries**: 5 attempts configured  
- **Retry Delay**: 2000ms between attempts
- **Fallback UI**: Triggers after maximum retry attempts exceeded
```

Focus on:
- Qualitative descriptions over fake quantitative data
- Actual configuration values from code
- Observable behaviors rather than percentages
- Implementation parameters that can be verified

## Creating Technical Post-Mortem Documents

When creating retrospective/post-mortem documents for complex technical issues, follow these guidelines:

### 1. Start with "The Solution That Actually Worked"

Add a concise section at the very top containing:
- **Problem**: Brief summary of the core issue
- **Solution**: Actual code/approach that fixed it
- **Result**: Measurable outcome improvement
- **PR**: Link to the relevant pull request

Example structure:
```markdown
## The Solution That Actually Worked

**Problem**: [Core technical issue in one sentence]

**Solution**: [Key implementation that resolved it]
\```language
// Actual code snippet
\```

**Result**: [Metric before] → [Metric after]

**PR**: [Link to PR]
```

### 2. Focus on Root Causes

- Identify the actual technical root cause, not just symptoms
- Distinguish between the primary issue and secondary problems
- Clearly separate the critical fix from nice-to-have improvements

### 3. Document Diagnostic Challenges

Essential aspects to capture:
- **Silent failures**: Issues with no error output or logging
- **Environment-specific**: Problems only reproducible in certain conditions
- **Tooling limitations**: Why standard debugging approaches failed
- **Documentation gaps**: Absence of existing solutions or references

Structure:
```markdown
**Why This Was Hard to Debug**:
- [Specific challenge 1]
- [Specific challenge 2]
- [Environmental factor]
- [Documentation status]
```

### 4. Specify Environmental Requirements

Document precise reproduction conditions:
- Hardware specifications (CPU, RAM, GPU)
- Operating system and version
- Virtualization attempts and why they failed
- Network/resource contention factors
- Distinguish between test hardware source (company vs external)

### 5. Chronicle the Investigation

Structure the timeline to show:
- Initial hypothesis and why it was wrong
- Each attempted solution and its failure mode
- The breakthrough that led to understanding
- How quick iteration became possible

### 6. Use Factual Metrics

- Avoid estimating affected user counts without data
- Use measurable metrics (success rates, response times)
- Prefer qualitative descriptions when quantitative data unavailable
- State impact factually ("critical customer affected" vs guessing numbers)

### 7. Layer Solutions Appropriately

When multiple improvements were made:
```markdown
## The Complete Solution

While [primary fix] was THE critical fix that resolved the crisis, 
we also implemented additional improvements:

### Layer 1: [Primary Fix Name] (THE MAIN FIX)
[Implementation details]

### Additional Improvements
- [Secondary improvement 1]
- [Secondary improvement 2]
```

### 8. Document Unsuccessful Remediation Attempts

Record what should have worked but didn't:
```markdown
### Known Issues Not Fixed by Updates

**Expected Fix**: [Update/patch that should have helped]
**Actual Result**: [Why it didn't resolve the issue]
**Root Cause**: [Why the fix was insufficient]
```

### 9. Include Comprehensive Code Examples

Provide code for:
- Problem manifestation
- Failed solution attempts
- Working implementation
- Before/after comparisons
- Configuration changes

### 10. Maintain Professional Documentation Standards

- Use consistent technical terminology
- Write in English for broader accessibility
- Exclude time tracking metrics unless essential
- Avoid decorative elements (emojis) in technical sections
- Translate any non-English content

### 11. Standard Document Structure

1. **The Solution That Actually Worked** (Top-level summary)
2. **Executive Summary** (One paragraph overview)
3. **The Problem** (Symptoms, impact, reproduction difficulty)
4. **Root Cause Analysis**
5. **Investigation Timeline** (Chronological attempts)
6. **The Solution** (Primary fix + additional improvements)
7. **Critical Discoveries** (Key insights)
8. **Metrics & Impact** (Before/after measurements)
9. **Lessons Learned** (Actionable takeaways)
10. **Future Recommendations**
11. **Conclusion**

### 12. Highlight Unprecedented Issues

When encountering undocumented problems:
- Emphasize the absence of existing documentation
- Explain why standard approaches failed
- Note when creating first-known documentation
- Include search terms that yielded no results

### 13. Theory Documentation

When the root cause involves unconfirmed theories:
- Clearly label as "theory" or "hypothesis"
- Explain the reasoning and evidence
- Describe what testing confirmed or refuted
- Include alternative explanations considered

### 14. Hardware vs Virtualization Distinctions

Document when issues are hardware-specific:
- VM configuration attempts and specifications
- Why virtualization couldn't reproduce the issue
- Hardware-specific factors (GPU, thermal, timing)
- Resource contention patterns

This structured approach ensures post-mortems are comprehensive, technically accurate, and valuable for future reference.

## Architecture Overview

This is an Electron desktop application for Rocket.Chat built with TypeScript and React.

### Entry Points
The application has three main entry files compiled by Rollup:
- `src/main.ts` - Main Electron process that orchestrates the application
- `src/rootWindow.ts` - Renderer process for the main window UI
- `src/preload.ts` - Preload script with privileged API access bridging main and renderer processes

### Core Technologies
- **Electron 37.2.4** - Desktop application framework
- **TypeScript 5.7.3** - Type-safe JavaScript
- **React 18.3.1** - UI components
- **Redux 5.0.1** - State management
- **Rollup** - Build bundler
- **Jest with Electron runner** - Testing framework

### Key Directories
- `src/main/` - Main process code
- `src/ui/` - React components and UI logic
- `src/preload/` - Preload scripts for secure IPC
- `src/servers/` - Server connection management
- `src/downloads/` - Download handling
- `src/notifications/` - Notification system
- `src/videoCallWindow/` - Video call window management
- `src/store/` - Redux store configuration
- `src/i18n/` - Internationalization resources

### State Management
The app uses Redux with a modular reducer structure. State is synchronized between main and renderer processes via IPC channels defined in `src/ipc/`.

### Server Configuration
Default servers can be configured via `servers.json` at the root level or in user preferences folders. The app supports multiple Rocket.Chat server connections simultaneously.

### Testing Strategy
Tests are split between main process tests (`*.main.spec.ts`) and renderer process tests (`*.spec.ts`). The test runner uses `@kayahr/jest-electron-runner` for proper Electron environment simulation.

## Important Configuration Files

- `rollup.config.mjs` - Build configuration
- `electron-builder.json` - Electron packager configuration  
- `tsconfig.json` - TypeScript compiler options
- `.eslintrc.json` - ESLint rules extending `@rocket.chat/eslint-config`
- `jest.config.js` - Jest test configuration with separate projects for main/renderer

## Code Style and Conventions

- Follow existing TypeScript patterns with strict mode enabled
- React components use functional components with hooks
- Redux actions follow FSA (Flux Standard Action) pattern
- File naming: camelCase for files, PascalCase for components
- All new code must pass ESLint and TypeScript checks
- Prefer editing existing files over creating new ones
- **No unnecessary comments** - Code must be self-documenting through clear naming and structure
- Only add comments for complex business logic or non-obvious decisions
- Keep code clean and professional - This is an open source project

## Library and Framework Usage

- **Always verify before using** - Check official documentation and type definitions, never guess
- For TypeScript libraries: Check `.d.ts` files in `node_modules/@package-name/dist/`
- For React components: Verify prop types, interfaces, and valid values in type definitions
- Never assume prop values, tokens, or API endpoints work without verification
- This prevents errors and ensures proper library usage

## UI Development - Fuselage Design System

- **MANDATORY: Use Fuselage components** for all UI development
- Storybook documentation: https://rocketchat.github.io/fuselage
- Repository: https://github.com/RocketChat/fuselage
- **Only create custom components when Fuselage doesn't provide the needed component**
- For Fuselage components: Check `Theme.d.ts` for valid color tokens and values
- Always use Fuselage's Box, Button, TextInput, Modal, etc. instead of HTML elements
- Follow Fuselage patterns for spacing, colors, and typography
- Import from `@rocket.chat/fuselage` package
- **Reference implementation examples**: 
  - Check https://github.com/RocketChat/Rocket.Chat for real-world Fuselage usage patterns
  - If available locally, reference the main Rocket.Chat repository for implementation examples

## Documentation Guidelines

- **Check existing docs first** - Always look in `docs/` folder before working on features
- **Update existing documentation** when making changes to documented features
- **Create documentation** for new features including flow diagrams, architecture explanations, usage examples
- Place all documentation in `docs/` directory with descriptive filenames
- Use markdown format for all documentation
- **Use simple language** - Write as if explaining to a colleague in plain English
- Avoid complex words: use "advanced" not "sophisticated", "use" not "utilize", "complex" not "intricate"

## Communication Guidelines

- Avoid subjective quality descriptors like "smart", "intelligent", "excellent", "dumb", or "poor"
- Don't call existing code "slow" - only state something is "faster" when measurably true
- Use measurable improvements: "reduced memory usage", "improved performance by X%", "simplified"
- Respect existing code - Don't diminish previous work; focus on objective improvements
- Describe changes factually without rating solutions as superior or inferior
- **Stay neutral** - We implement and describe, not evaluate. Let users judge the value
- Remember that all code is temporary - Today's solution will be tomorrow's legacy code
- Focus on "what" and "how", not subjective "better" or "worse"
- When changes provide benefits, describe them objectively (e.g., "reduces API calls from 5 to 1" not "better approach")
- **Keep PR descriptions simple** - Use straightforward language, avoid fancy or overly professional words
- Write clearly and directly as if explaining to a colleague

## Git Guidelines

- **NEVER** make git commits, merges, rebases, or any git write operations unless explicitly requested by the user
- **NEVER** push to remote repositories unless explicitly requested
- Git read operations (status, diff, log, show) are allowed for understanding code context
- When the user asks for a commit, always show what will be committed first
- Always wait for user confirmation before any git write operation

## Git Worktrees for Agents

- **Agents should automatically create worktrees** to avoid disrupting user's work
- **Always create worktrees in a dedicated folder**: `../Rocket.Chat.Electron-worktrees/`
- **Branch from master unless specified otherwise** - Always create new branches from `master` branch
- When starting work on a feature/fix, agents should:
  1. Create the worktrees folder if it doesn't exist: `mkdir -p ../Rocket.Chat.Electron-worktrees`
  2. Create a new worktree branching from master: `git worktree add ../Rocket.Chat.Electron-worktrees/feature-name -b new-feature-branch master`
  3. Change to the worktree directory before making changes
  4. Install dependencies in the worktree: `yarn`
  5. Work independently without affecting the user's main repository
- **Clean up after work**: Remove worktree when task is complete or merged
- Each worktree has its own:
  - Working directory and branch
  - Build outputs (app/ folder)
  - node_modules dependencies
- Common commands:
  - `git worktree add ../Rocket.Chat.Electron-worktrees/feature-name -b new-branch` - Create worktree with new branch
  - `git worktree list` - List all worktrees
  - `git worktree remove ../Rocket.Chat.Electron-worktrees/feature-name` - Remove worktree when done