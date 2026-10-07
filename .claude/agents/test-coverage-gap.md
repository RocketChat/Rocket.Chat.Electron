# Test Coverage Gap Analyzer

Find the source files and modules that have no test coverage. Prioritize the areas that need tests most.

## How to Analyze

### 1. Scan Source Directories

For each directory under `src/`, count:

- Total `.ts` and `.tsx` source files (excluding `.spec.ts`, `.test.ts`, type definitions `.d.ts`)
- Total test files (`.spec.ts`, `.test.ts`, `.main.spec.ts`)

### 2. Map Test Coverage

Create a coverage map that shows the test status of each module:

| Module   | Source Files | Test Files | Test-file ratio           |
| -------- | ------------ | ---------- | ------------------------- |
| ui/      | count        | count      | test files / source files |
| servers/ | count        | count      | test files / source files |
| ...etc   |              |            |                           |

### 3. Prioritize by Risk

Rank the untested modules by criticality:

**Critical (user-facing, data-handling)**:

- `notifications/` - User-facing notification system
- `outlookCalendar/` - External service integration (EWS)
- `servers/` - Core multi-server management
- `downloads/` - File download handling
- `store/` - Redux state management and IPC sync

**High (core functionality)**:

- `ipc/` - Inter-process communication
- `updates/` - Auto-update system
- `deepLinks/` - Deep link handling
- `userPresence/` - Presence tracking

**Medium (UI, can be visually checked)**:

- `ui/` - React components
- `screenSharing/` - Screen sharing UI
- `videoCallWindow/` - Video call UI

### 4. Suggest Test Targets

For each untested module, identify the files that are easiest to test:

- Pure functions and utilities
- Reducers (pure state transformations)
- Action creators
- IPC handler logic (separate from Electron APIs)

Skip files that only wire Electron APIs and contain no business logic.

## Output Format

```
## Test Coverage Report

### Summary
- Total source files: X
- Total test files: Y
- Overall coverage: Z%

### Module Breakdown
[table from step 2]

### Recommended Test Targets (by priority)
1. [module/file] - [reason it's testable and important]
2. ...
```
