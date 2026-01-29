# Log Viewer Feature - Professional Code Review & Remediation Plan

## TL;DR

> **Quick Summary**: Comprehensive code review of the Log Viewer feature with 23 identified issues across security, performance, accessibility, and code quality. Plan brings the feature to match the project's established patterns.
>
> **Deliverables**:
>
> - Security hardening (context isolation, path validation)
> - TypeScript improvements (proper typing, remove unsafe casts)
> - Performance fixes (memory leaks, debouncing, memoization)
> - Accessibility enhancements (ARIA labels, keyboard navigation)
> - Code quality alignment (constants, error handling, patterns)
>
> **Estimated Effort**: Medium-Large
> **Parallel Execution**: YES - 4 waves
> **Critical Path**: Security fixes -> Type safety -> Performance -> Polish

---

## Context

### Code Review Summary

**Files Analyzed** (1,916 lines total):
| File | Lines | Purpose |
|------|-------|---------|
| `src/logViewerWindow/logViewerWindow.tsx` | 764 | Main React component |
| `src/logViewerWindow/ipc.ts` | 272 | IPC handlers |
| `src/logging/index.ts` | 321 | Logging configuration |
| `src/logging/context.ts` | 245 | Context detection |
| `src/logViewerWindow/LogEntry.tsx` | 143 | Log entry component |
| `src/logging/utils.ts` | 62 | Utility functions |
| `src/logging/preload.ts` | 60 | Renderer console override |
| `src/logViewerWindow/log-viewer-window.tsx` | 49 | Entry point |

### Comparison with Project Standards

| Pattern           | Project Standard           | Log Viewer       | Status   |
| ----------------- | -------------------------- | ---------------- | -------- |
| Context Isolation | Enabled                    | **Disabled**     | CRITICAL |
| IPC Channel Types | Centralized in channels.ts | Done             | OK       |
| Error Boundaries  | ErrorCatcher component     | Missing          | FIX      |
| Constants         | Named constants            | Magic numbers    | FIX      |
| Debouncing        | debounce utility           | Missing          | FIX      |
| TypeScript        | Strict typing              | Some `any` types | FIX      |
| i18n              | All strings translated     | Some hardcoded   | FIX      |
| Accessibility     | ARIA labels                | Missing          | FIX      |

---

## Work Objectives

### Core Objective

Bring the Log Viewer feature to professional quality matching the rest of the Rocket.Chat.Electron codebase.

### Concrete Deliverables

- Security-hardened window configuration
- Fully typed IPC communication
- React error boundary integration
- Performance-optimized log parsing
- Accessible UI with keyboard navigation
- Consistent code patterns with project

### Definition of Done

- [ ] `yarn lint` passes with 0 errors
- [ ] `yarn test` all tests pass
- [ ] No TypeScript `any` types in log viewer files
- [ ] Context isolation enabled
- [ ] All user-facing strings in i18n files
- [ ] ARIA labels on all interactive elements

### Must Have

- Security fixes (context isolation, path validation)
- Error boundary wrapping
- Proper TypeScript types
- Memory leak fixes

### Must NOT Have (Guardrails)

- Breaking changes to existing log viewer functionality
- New external dependencies without justification
- Disabling existing security features elsewhere
- Over-engineering (keep changes focused)

---

## Verification Strategy

### Test Decision

- **Infrastructure exists**: YES (Jest with electron runner)
- **User wants tests**: TDD for new utility functions
- **Framework**: Jest

### Automated Verification

Each TODO includes verification via:

- `yarn lint` - ESLint passes
- `yarn test` - All tests pass
- Manual verification in dev mode

---

## Execution Strategy

### Parallel Execution Waves

```
Wave 1 (Critical Security - Start Immediately):
├── Task 1: Enable context isolation + preload script
├── Task 2: Add path validation for file operations
└── Task 3: Add error boundary to log viewer

Wave 2 (Type Safety - After Wave 1):
├── Task 4: Create typed IPC response interfaces
├── Task 5: Remove unsafe type casts
└── Task 6: Type the log parsing functions

Wave 3 (Performance - After Wave 2):
├── Task 7: Fix memory leak in auto-refresh interval
├── Task 8: Add debouncing to search filter
├── Task 9: Memoize regex patterns
└── Task 10: Add constants file

Wave 4 (Polish - After Wave 3):
├── Task 11: Add ARIA labels and keyboard shortcuts
├── Task 12: Fix hardcoded locale in date formatting
├── Task 13: Add missing i18n strings
└── Task 14: Align file naming conventions

Critical Path: Task 1 → Task 4 → Task 7 → Task 11
```

### Dependency Matrix

| Task | Depends On | Blocks | Parallelize With |
| ---- | ---------- | ------ | ---------------- |
| 1    | None       | 4      | 2, 3             |
| 2    | None       | None   | 1, 3             |
| 3    | None       | None   | 1, 2             |
| 4    | 1          | 5, 6   | None             |
| 5    | 4          | 7      | 6                |
| 6    | 4          | 7      | 5                |
| 7    | 5, 6       | 11     | 8, 9, 10         |
| 8    | None       | None   | 7, 9, 10         |
| 9    | None       | None   | 7, 8, 10         |
| 10   | None       | None   | 7, 8, 9          |
| 11   | 7          | None   | 12, 13, 14       |
| 12   | None       | None   | 11, 13, 14       |
| 13   | None       | None   | 11, 12, 14       |
| 14   | None       | None   | 11, 12, 13       |

---

## TODOs

### Wave 1: Critical Security Fixes

- [ ] 1. Enable Context Isolation and Create Preload Script

  **What to do**:

  - Modify `src/logViewerWindow/ipc.ts` BrowserWindow config to enable `contextIsolation: true`
  - Create `src/logViewerWindow/preload.ts` with contextBridge API exposure
  - Update log viewer renderer to use exposed API instead of direct `ipcRenderer`

  **Must NOT do**:

  - Break existing IPC communication
  - Expose unnecessary APIs through contextBridge

  **Recommended Agent Profile**:

  - **Category**: `quick`
  - **Skills**: []

  **Parallelization**:

  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 2, 3)
  - **Blocks**: Task 4
  - **Blocked By**: None

  **References**:

  - `src/videoCallWindow/preload/index.ts` - Pattern for preload script structure
  - `src/logViewerWindow/ipc.ts:54-63` - Current insecure config to fix
  - `src/ipc/channels.ts:68-98` - Log viewer channel definitions

  **Acceptance Criteria**:

  - [ ] `contextIsolation: true` in BrowserWindow webPreferences
  - [ ] `src/logViewerWindow/preload.ts` exists with contextBridge
  - [ ] Log viewer still functions (open, read logs, filter)
  - [ ] `yarn lint` passes

  **Commit**: YES

  - Message: `security(log-viewer): enable context isolation with preload script`
  - Files: `src/logViewerWindow/ipc.ts`, `src/logViewerWindow/preload.ts`

---

- [ ] 2. Add Path Validation for File Operations

  **What to do**:

  - Create path validation utility in `src/logViewerWindow/ipc.ts`
  - Validate user-provided file paths against allowed directories
  - Prevent path traversal attacks (e.g., `../../sensitive-file`)
  - Only allow `.log` and `.txt` file extensions

  **Must NOT do**:

  - Over-restrict legitimate log file locations
  - Block default electron-log path

  **Recommended Agent Profile**:

  - **Category**: `quick`
  - **Skills**: []

  **Parallelization**:

  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 1, 3)
  - **Blocks**: None
  - **Blocked By**: None

  **References**:

  - `src/logViewerWindow/ipc.ts:143-145` - Current unsafe path handling
  - `src/logViewerWindow/ipc.ts:21-25` - getLogFilePath function
  - Node.js `path.resolve()` and `path.normalize()` for safe path handling

  **Acceptance Criteria**:

  - [ ] Path validation function exists
  - [ ] Rejects paths containing `..`
  - [ ] Rejects non-.log/.txt extensions (except for default log)
  - [ ] Test: `../../etc/passwd` path is rejected
  - [ ] `yarn lint` passes

  **Commit**: YES

  - Message: `security(log-viewer): add path validation for file operations`
  - Files: `src/logViewerWindow/ipc.ts`

---

- [ ] 3. Add Error Boundary to Log Viewer

  **What to do**:

  - Import and wrap LogViewerWindow with ErrorCatcher component
  - Add error state display for graceful degradation
  - Log errors to console for debugging

  **Must NOT do**:

  - Create duplicate error boundary implementation
  - Swallow errors silently

  **Recommended Agent Profile**:

  - **Category**: `quick`
  - **Skills**: []

  **Parallelization**:

  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 1, 2)
  - **Blocks**: None
  - **Blocked By**: None

  **References**:

  - `src/ui/components/utils/ErrorCatcher.tsx` - Existing error boundary to use
  - `src/ui/components/App.tsx:50-52` - Pattern for wrapping with ErrorCatcher
  - `src/logViewerWindow/log-viewer-window.tsx` - Entry point to modify

  **Acceptance Criteria**:

  - [ ] ErrorCatcher wraps LogViewerWindow component
  - [ ] Parse error in log file shows error UI instead of crash
  - [ ] `yarn lint` passes

  **Commit**: YES

  - Message: `fix(log-viewer): add error boundary for graceful error handling`
  - Files: `src/logViewerWindow/log-viewer-window.tsx`

---

### Wave 2: Type Safety

- [ ] 4. Create Typed IPC Response Interfaces

  **What to do**:

  - Create `src/logViewerWindow/types.ts` with all IPC response types
  - Export types for use in both main and renderer
  - Types already exist in `channels.ts` - ensure renderer uses them

  **Must NOT do**:

  - Duplicate type definitions
  - Use `any` type

  **Recommended Agent Profile**:

  - **Category**: `quick`
  - **Skills**: []

  **Parallelization**:

  - **Can Run In Parallel**: NO
  - **Parallel Group**: Sequential after Wave 1
  - **Blocks**: Tasks 5, 6
  - **Blocked By**: Task 1

  **References**:

  - `src/ipc/channels.ts:68-98` - Existing channel type definitions
  - `src/logViewerWindow/logViewerWindow.tsx:197-202` - Untyped IPC calls
  - `src/outlookCalendar/type.ts` - Pattern for feature-specific types

  **Acceptance Criteria**:

  - [ ] `src/logViewerWindow/types.ts` created with exported interfaces
  - [ ] IPC responses properly typed in renderer
  - [ ] No `any` types in IPC handling code
  - [ ] `yarn lint` passes

  **Commit**: YES

  - Message: `types(log-viewer): add typed interfaces for IPC responses`
  - Files: `src/logViewerWindow/types.ts`, `src/logViewerWindow/logViewerWindow.tsx`

---

- [ ] 5. Remove Unsafe Type Casts

  **What to do**:

  - Replace `level.trim() as LogLevel` with proper validation
  - Add runtime type guard for LogLevel
  - Handle unknown log levels gracefully

  **Must NOT do**:

  - Crash on unknown log levels
  - Silently ignore type errors

  **Recommended Agent Profile**:

  - **Category**: `quick`
  - **Skills**: []

  **Parallelization**:

  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Task 6)
  - **Blocks**: Task 7
  - **Blocked By**: Task 4

  **References**:

  - `src/logViewerWindow/logViewerWindow.tsx:172` - Unsafe cast
  - `src/logViewerWindow/LogEntry.tsx:3` - LogLevel type definition

  **Acceptance Criteria**:

  - [ ] `isLogLevel()` type guard function exists
  - [ ] Unknown levels default to 'info' or 'verbose'
  - [ ] No `as LogLevel` casts remain
  - [ ] `yarn lint` passes

  **Commit**: YES

  - Message: `types(log-viewer): replace unsafe type casts with type guards`
  - Files: `src/logViewerWindow/logViewerWindow.tsx`, `src/logViewerWindow/LogEntry.tsx`

---

- [ ] 6. Type the Log Parsing Functions

  **What to do**:

  - Add explicit return types to parseLogLines
  - Type the regex match results
  - Add JSDoc comments for complex functions

  **Must NOT do**:

  - Change parsing logic
  - Add unnecessary complexity

  **Recommended Agent Profile**:

  - **Category**: `quick`
  - **Skills**: []

  **Parallelization**:

  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Task 5)
  - **Blocks**: Task 7
  - **Blocked By**: Task 4

  **References**:

  - `src/logViewerWindow/logViewerWindow.tsx:139-191` - parseLogLines function
  - `src/logViewerWindow/LogEntry.tsx:5-12` - LogEntryType definition

  **Acceptance Criteria**:

  - [ ] parseLogLines has explicit return type
  - [ ] All internal variables are typed
  - [ ] JSDoc comment explains function behavior
  - [ ] `yarn lint` passes

  **Commit**: YES

  - Message: `types(log-viewer): add explicit types to log parsing functions`
  - Files: `src/logViewerWindow/logViewerWindow.tsx`

---

### Wave 3: Performance Fixes

- [ ] 7. Fix Memory Leak in Auto-Refresh Interval

  **What to do**:

  - Fix useEffect dependency causing interval recreation
  - Use useRef to store lastModifiedTime instead of in callback
  - Ensure interval is properly cleaned up

  **Must NOT do**:

  - Break auto-refresh functionality
  - Remove the feature

  **Recommended Agent Profile**:

  - **Category**: `quick`
  - **Skills**: []

  **Parallelization**:

  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3 (with Tasks 8, 9, 10)
  - **Blocks**: Task 11
  - **Blocked By**: Tasks 5, 6

  **References**:

  - `src/logViewerWindow/logViewerWindow.tsx:325-347` - checkForUpdates and interval
  - `src/ui/main/debounce.ts` - Project's debounce utility
  - React useRef documentation for mutable values

  **Acceptance Criteria**:

  - [ ] Interval is created only once when streaming starts
  - [ ] useRef used for mutable lastModifiedTime
  - [ ] Auto-refresh still works correctly
  - [ ] No console warnings about missing dependencies
  - [ ] `yarn lint` passes

  **Commit**: YES

  - Message: `perf(log-viewer): fix memory leak in auto-refresh interval`
  - Files: `src/logViewerWindow/logViewerWindow.tsx`

---

- [ ] 8. Add Debouncing to Search Filter

  **What to do**:

  - Import useDebouncedValue from fuselage-hooks or create local hook
  - Debounce search filter changes by 300ms
  - Prevent excessive re-filtering on every keystroke

  **Must NOT do**:

  - Make search feel unresponsive (keep debounce < 500ms)
  - Break existing filter behavior

  **Recommended Agent Profile**:

  - **Category**: `quick`
  - **Skills**: []

  **Parallelization**:

  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3 (with Tasks 7, 9, 10)
  - **Blocks**: None
  - **Blocked By**: None

  **References**:

  - `src/logViewerWindow/logViewerWindow.tsx:71-76` - Current handler
  - `@rocket.chat/fuselage-hooks` - useDebouncedValue hook
  - `src/ui/main/debounce.ts` - Project's debounce utility

  **Acceptance Criteria**:

  - [ ] Search input updates immediately (UX)
  - [ ] Actual filtering is debounced by 300ms
  - [ ] Rapid typing doesn't cause lag
  - [ ] `yarn lint` passes

  **Commit**: YES

  - Message: `perf(log-viewer): debounce search filter for better performance`
  - Files: `src/logViewerWindow/logViewerWindow.tsx`

---

- [ ] 9. Memoize Regex Patterns

  **What to do**:

  - Move regex patterns outside parseLogLines function
  - Define as module-level constants
  - Add comments explaining each pattern

  **Must NOT do**:

  - Change regex behavior
  - Break log parsing

  **Recommended Agent Profile**:

  - **Category**: `quick`
  - **Skills**: []

  **Parallelization**:

  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3 (with Tasks 7, 8, 10)
  - **Blocks**: None
  - **Blocked By**: None

  **References**:

  - `src/logViewerWindow/logViewerWindow.tsx:143-145` - Regex in loop
  - `src/logViewerWindow/logViewerWindow.tsx:151` - Context regex

  **Acceptance Criteria**:

  - [ ] `LOG_LINE_REGEX` constant at module level
  - [ ] `CONTEXT_REGEX` constant at module level
  - [ ] Comments explain regex patterns
  - [ ] Parsing still works correctly
  - [ ] `yarn lint` passes

  **Commit**: YES

  - Message: `perf(log-viewer): memoize regex patterns for parsing`
  - Files: `src/logViewerWindow/logViewerWindow.tsx`

---

- [ ] 10. Add Constants File

  **What to do**:

  - Create `src/logViewerWindow/constants.ts`
  - Move all magic numbers to named constants
  - Group related constants together

  **Must NOT do**:

  - Over-abstract simple values
  - Create constants for one-time use values

  **Recommended Agent Profile**:

  - **Category**: `quick`
  - **Skills**: []

  **Parallelization**:

  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3 (with Tasks 7, 8, 9)
  - **Blocks**: None
  - **Blocked By**: None

  **References**:

  - `src/videoCallWindow/ipc.ts:31-36` - Pattern for constants
  - `src/logViewerWindow/logViewerWindow.tsx` - Magic numbers: 2000, 100, 0.8
  - `src/logViewerWindow/ipc.ts` - Magic numbers: 10MB max size

  **Acceptance Criteria**:

  - [ ] `src/logViewerWindow/constants.ts` created
  - [ ] `AUTO_REFRESH_INTERVAL_MS = 2000`
  - [ ] `SCROLL_DELAY_MS = 100`
  - [ ] `WINDOW_SIZE_MULTIPLIER = 0.8`
  - [ ] All magic numbers replaced with imports
  - [ ] `yarn lint` passes

  **Commit**: YES

  - Message: `refactor(log-viewer): extract magic numbers to constants`
  - Files: `src/logViewerWindow/constants.ts`, `src/logViewerWindow/logViewerWindow.tsx`, `src/logViewerWindow/ipc.ts`

---

### Wave 4: Polish & Accessibility

- [ ] 11. Add ARIA Labels and Keyboard Shortcuts

  **What to do**:

  - Add aria-label to all Icon components
  - Add aria-describedby for complex controls
  - Add keyboard shortcuts: Ctrl+F (search), Ctrl+S (save), Escape (clear)

  **Must NOT do**:

  - Break existing mouse interactions
  - Conflict with system shortcuts

  **Recommended Agent Profile**:

  - **Category**: `quick`
  - **Skills**: [`frontend-ui-ux`]

  **Parallelization**:

  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 4 (with Tasks 12, 13, 14)
  - **Blocks**: None
  - **Blocked By**: Task 7

  **References**:

  - `src/logViewerWindow/logViewerWindow.tsx:515-517` - Icons needing labels
  - `src/ui/components/SideBar/useKeyboardShortcuts.tsx` - Keyboard shortcut pattern
  - WAI-ARIA Authoring Practices for log viewers

  **Acceptance Criteria**:

  - [ ] All icons have aria-label
  - [ ] Ctrl+F focuses search input
  - [ ] Ctrl+S triggers save dialog
  - [ ] Escape clears search filter
  - [ ] `yarn lint` passes

  **Commit**: YES

  - Message: `a11y(log-viewer): add ARIA labels and keyboard shortcuts`
  - Files: `src/logViewerWindow/logViewerWindow.tsx`, `src/logViewerWindow/LogEntry.tsx`

---

- [ ] 12. Fix Hardcoded Locale in Date Formatting

  **What to do**:

  - Replace hardcoded 'en-GB' with user's locale
  - Use i18n.language or navigator.language
  - Add date format option in UI (optional)

  **Must NOT do**:

  - Break date display
  - Add complex date picker

  **Recommended Agent Profile**:

  - **Category**: `quick`
  - **Skills**: []

  **Parallelization**:

  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 4 (with Tasks 11, 13, 14)
  - **Blocks**: None
  - **Blocked By**: None

  **References**:

  - `src/logViewerWindow/logViewerWindow.tsx:235` - Hardcoded locale
  - `src/i18n/common.ts` - i18n configuration
  - `useTranslation()` hook for language access

  **Acceptance Criteria**:

  - [ ] Date formatting uses user's locale
  - [ ] `toLocaleTimeString()` called without hardcoded locale
  - [ ] Dates display correctly in different locales
  - [ ] `yarn lint` passes

  **Commit**: YES

  - Message: `i18n(log-viewer): use user locale for date formatting`
  - Files: `src/logViewerWindow/logViewerWindow.tsx`

---

- [ ] 13. Add Missing i18n Strings

  **What to do**:

  - Audit all user-visible strings in log viewer
  - Add any missing translations to en.i18n.json
  - Add corresponding pt-BR translations

  **Must NOT do**:

  - Remove existing translations
  - Use machine translation without review

  **Recommended Agent Profile**:

  - **Category**: `quick`
  - **Skills**: []

  **Parallelization**:

  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 4 (with Tasks 11, 12, 14)
  - **Blocks**: None
  - **Blocked By**: None

  **References**:

  - `src/i18n/en.i18n.json` - English translations
  - `src/i18n/pt-BR.i18n.json` - Portuguese translations
  - `src/logViewerWindow/logViewerWindow.tsx` - Strings to audit

  **Acceptance Criteria**:

  - [ ] "entries" count string is translated
  - [ ] Outlook filter option translated
  - [ ] All error messages translated
  - [ ] `yarn lint` passes

  **Commit**: YES

  - Message: `i18n(log-viewer): add missing translation strings`
  - Files: `src/i18n/en.i18n.json`, `src/i18n/pt-BR.i18n.json`

---

- [ ] 14. Align File Naming Conventions

  **What to do**:

  - Rename `log-viewer-window.tsx` to `index.tsx` (entry point pattern)
  - OR rename to match `logViewerWindow.tsx` (camelCase consistency)
  - Update imports accordingly

  **Must NOT do**:

  - Break build process
  - Change multiple conventions at once

  **Recommended Agent Profile**:

  - **Category**: `quick`
  - **Skills**: []

  **Parallelization**:

  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 4 (with Tasks 11, 12, 13)
  - **Blocks**: None
  - **Blocked By**: None

  **References**:

  - `src/videoCallWindow/video-call-window.tsx` - Same pattern (kebab-case for entry)
  - `src/logViewerWindow/log-viewer-window.tsx` - Current naming
  - `rollup.config.mjs` - Build configuration for entry points

  **Acceptance Criteria**:

  - [ ] Consistent with videoCallWindow naming
  - [ ] Build still works
  - [ ] `yarn build` passes
  - [ ] `yarn lint` passes

  **Commit**: YES

  - Message: `refactor(log-viewer): align file naming with project conventions`
  - Files: Renamed files

---

## Commit Strategy

| After Task | Message                                          | Files                             | Verification |
| ---------- | ------------------------------------------------ | --------------------------------- | ------------ |
| 1          | `security(log-viewer): enable context isolation` | ipc.ts, preload.ts                | yarn lint    |
| 2          | `security(log-viewer): add path validation`      | ipc.ts                            | yarn lint    |
| 3          | `fix(log-viewer): add error boundary`            | log-viewer-window.tsx             | yarn lint    |
| 4          | `types(log-viewer): add IPC response types`      | types.ts, logViewerWindow.tsx     | yarn lint    |
| 5          | `types(log-viewer): replace unsafe casts`        | logViewerWindow.tsx, LogEntry.tsx | yarn lint    |
| 6          | `types(log-viewer): type parsing functions`      | logViewerWindow.tsx               | yarn lint    |
| 7          | `perf(log-viewer): fix interval memory leak`     | logViewerWindow.tsx               | yarn lint    |
| 8          | `perf(log-viewer): debounce search filter`       | logViewerWindow.tsx               | yarn lint    |
| 9          | `perf(log-viewer): memoize regex patterns`       | logViewerWindow.tsx               | yarn lint    |
| 10         | `refactor(log-viewer): extract constants`        | constants.ts, \*.tsx              | yarn lint    |
| 11         | `a11y(log-viewer): add ARIA and keyboard nav`    | logViewerWindow.tsx, LogEntry.tsx | yarn lint    |
| 12         | `i18n(log-viewer): use user locale for dates`    | logViewerWindow.tsx               | yarn lint    |
| 13         | `i18n(log-viewer): add missing translations`     | \*.i18n.json                      | yarn lint    |
| 14         | `refactor(log-viewer): align file naming`        | renamed files                     | yarn build   |

---

## Success Criteria

### Verification Commands

```bash
yarn lint       # Expected: 0 errors, 0 warnings
yarn test       # Expected: All tests pass
yarn build      # Expected: Build succeeds
```

### Final Checklist

- [ ] All 14 tasks completed
- [ ] No TypeScript `any` types in log viewer
- [ ] Context isolation enabled
- [ ] All strings internationalized
- [ ] ARIA labels on all interactive elements
- [ ] No magic numbers in code
- [ ] Memory leak fixed
- [ ] Search is debounced

---

## Issue Severity Summary

| Severity | Count | Status              |
| -------- | ----- | ------------------- |
| CRITICAL | 2     | Tasks 1, 2          |
| HIGH     | 5     | Tasks 3, 4, 5, 6, 7 |
| MEDIUM   | 7     | Tasks 8-14          |

**Total: 14 tasks across 4 waves**
