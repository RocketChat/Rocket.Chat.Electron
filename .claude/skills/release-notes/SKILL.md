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

Parse commit messages using conventional commit prefixes and categorize:

| Prefix | Category |
|--------|----------|
| `feat:` | New Features |
| `fix:` | Bug Fixes |
| `perf:` | Performance |
| `refactor:` | Improvements |
| `chore:` | Maintenance |
| `docs:` | Documentation |
| `ci:` | CI/CD |
| `test:` | Testing |

Commits without conventional prefixes go under "Other Changes".

### 4. Format Output

```markdown
## What's Changed

### New Features
- Description of feature (#PR)

### Bug Fixes
- Description of fix (#PR)

### Improvements
- Description of improvement (#PR)

### Maintenance
- Description of chore (#PR)
```

### 5. Version Context

Detect the version type from `package.json` and note:
- Alpha releases (`X.Y.Z-alpha.N`): Mark as "Alpha Release - For QA and early testing"
- Beta releases (`X.Y.Z-beta.N`): Mark as "Beta Release - Pre-release testing"
- Stable releases (`X.Y.Z`): Mark as "Stable Release"

### 6. Output

Present the formatted release notes to the user for review. Do not create any files unless asked.
