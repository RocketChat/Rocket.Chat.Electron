---
name: release-notes
description: Generate release notes from git history between tags
---

# Release Notes Generator

Generate categorized release notes from git commit history between two tags or refs.

## Arguments

- `from` (optional): Starting tag/ref. Defaults to the previous tag.
- `to` (optional): Ending tag/ref. Defaults to HEAD.

## Steps

### 1. Determine Range

If `from` is not provided, find the most recent tag:

```bash
git describe --tags --abbrev=0 HEAD~1
```

If `to` is not provided, use `HEAD`.

### 2. Gather Commits

```bash
git log --oneline --no-merges <from>..<to>
```

### 3. Categorize

Sort each commit into the three groups that `ship-release` publishes. Use the
conventional commit prefix as the first signal:

| Prefix                                      | Group           |
| ------------------------------------------- | --------------- |
| `fix:`                                      | 🐛 Fixes        |
| `feat:`, `perf:`, `refactor:`               | ✨ Improvements |
| `chore:`, `docs:`, `ci:`, `test:`, `build:` | 🔧 Internal     |

A commit without a prefix goes in the group that matches what it changes for a
user. A change that users can see is never Internal.

### 4. Format Output

```markdown
## What's Changed

### 🐛 Fixes

- Description of fix (#PR)

### ✨ Improvements

- Description of improvement (#PR)

### 🔧 Internal

- Description of internal change (#PR)
```

### 5. Version Context

Detect the version type from `package.json` and note:

- Alpha releases (`X.Y.Z-alpha.N`): Mark as "Alpha Release - For QA and early testing"
- Beta releases (`X.Y.Z-beta.N`): Mark as "Beta Release - Pre-release testing"
- Stable releases (`X.Y.Z`): Mark as "Stable Release"

### 6. Output

Present the formatted release notes to the user for review. Do not create any files unless asked.
