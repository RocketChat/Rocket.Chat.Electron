# Fix Context Filter Mismatches

## TL;DR

> **Quick Summary**: Fix 3 mismatches between log viewer filters and automatic context detection so filters work correctly.
>
> **Deliverables**:
>
> - Fixed `context.ts` to return matching context names
>
> **Estimated Effort**: Quick (5 minutes)
> **Parallel Execution**: NO - single file change
> **Critical Path**: Edit → Lint → Commit

---

## Context

### Original Request

Verify all context filters follow the same pattern as the outlook filter (automatic detection via stack trace).

### Analysis Findings

**Mismatches Found:**

| Filter Option   | Auto-Detection Returns      | Should Return     | Issue               |
| --------------- | --------------------------- | ----------------- | ------------------- |
| `updates`       | `'update'` (singular)       | `'updates'`       | Singular vs plural  |
| `notifications` | `'notification'` (singular) | `'notifications'` | Singular vs plural  |
| `servers`       | None                        | `'servers'`       | No detection exists |

**Working Correctly:**

- `main`, `renderer`, `webview` - Match processType
- `videocall`, `outlook`, `auth`, `ipc` - Match component context

---

## Work Objectives

### Core Objective

Align auto-detected context names with filter options and scoped logger names.

### Concrete Deliverables

- `src/logging/context.ts` updated with 3 fixes

### Definition of Done

- [x] `yarn lint` passes ✅
- [x] Filters match auto-detection and scoped loggers ✅

### Must NOT Have

- No changes to filter logic in logViewerWindow.tsx (detection should match filters, not vice versa)
- No breaking changes to existing working filters

---

## Verification Strategy

### Automated Verification

```bash
yarn lint
```

---

## TODOs

- [x] 1. Fix context detection mismatches in context.ts ✅ (commit: 8923ee14)

  **What to do**:
  In `src/logging/context.ts`, function `getComponentContext()`:

  1. Change `return 'notification';` → `return 'notifications';` (around line 131)
  2. Change `return 'update';` → `return 'updates';` (around line 134)
  3. Add new detection block for servers (before the videocall check):

  ```typescript
  if (
    stack.includes('server') ||
    stack.includes('Server') ||
    stack.includes('servers')
  ) {
    return 'servers';
  }
  ```

  **Must NOT do**:

  - Don't change any other return values
  - Don't modify the detection logic patterns (stack.includes checks)

  **Recommended Agent Profile**:

  - **Category**: `quick`
  - **Skills**: `[]` (no special skills needed)

  **Parallelization**:

  - **Can Run In Parallel**: NO
  - **Parallel Group**: Sequential
  - **Blocks**: Task 2
  - **Blocked By**: None

  **References**:

  - `src/logging/context.ts:129-135` - Current notification/update detection to fix
  - `src/logging/context.ts:147-152` - videocall detection pattern to follow for servers
  - `src/logViewerWindow/logViewerWindow.tsx:127-142` - Filter options that must match
  - `src/logging/scopes.ts:34-37` - Scoped logger names to align with

  **Acceptance Criteria**:

  - [x] `return 'notification'` changed to `return 'notifications'` ✅
  - [x] `return 'update'` changed to `return 'updates'` ✅
  - [x] New servers detection block added ✅
  - [x] `yarn lint` → 0 errors ✅

  **Commit**: YES

  - Message: `fix(logging): align context detection with filter options`
  - Files: `src/logging/context.ts`
  - Pre-commit: `yarn lint`

---

## Commit Strategy

| After Task | Message                                                     | Files      | Verification |
| ---------- | ----------------------------------------------------------- | ---------- | ------------ |
| 1          | `fix(logging): align context detection with filter options` | context.ts | yarn lint    |

---

## Success Criteria

### Verification Commands

```bash
yarn lint  # Expected: 0 errors
```

### Final Checklist

- [x] `notifications` filter catches notification-related console.logs ✅
- [x] `updates` filter catches update-related console.logs ✅
- [x] `servers` filter catches server-related console.logs ✅
- [x] All existing filters still work ✅

## Completion

**Status**: ✅ COMPLETE
**Commit**: `8923ee14202857a37ac865edd5cc98ea91ec9398`
**Pushed**: Yes (debug-outlook branch)
