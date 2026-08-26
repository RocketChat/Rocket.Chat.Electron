---
name: worktree-gc
description: Find and remove git worktrees, local branches, and stashes left behind by merged or abandoned work; dry-run first, delete only what the user confirms
disable-model-invocation: true
---

# Worktree GC

Find git worktrees, local branches, and stashes that are safe to remove
because their work already merged or was abandoned. Always dry-run first
and STOP for explicit confirmation before deleting anything. This skill
runs from the main checkout (the project root);
per AGENTS.md, project worktrees live under
`../Rocket.Chat.Electron-worktrees/` (sibling of the main checkout, created
via `git worktree add ../Rocket.Chat.Electron-worktrees/<name> -b <branch> master`).

## Steps

### 1. Inventory worktrees

```bash
git worktree list --porcelain
```

Parse into `path`, `branch` (or `detached`), and for each:

```bash
git -C <path> status --porcelain
git -C <path> log -1 --format=%cI
```

Record: path, branch/detached, dirty (non-empty `status --porcelain`
output) or clean, last commit date/age.

### 2. Check PR state per branch

For each worktree with a branch (skip detached ones here):

```bash
gh pr list --state merged --head <branch> --json number,mergedAt --jq '.[] | "\(.number) \(.mergedAt)"' --repo RocketChat/Rocket.Chat.Electron
gh pr list --state open --head <branch> --json number --jq '.[].number' --repo RocketChat/Rocket.Chat.Electron
```

### 3. Classify

- **MERGED** — a merged PR exists for the branch AND the worktree is
  clean → remove candidate.
- **DETACHED, clean, >30 days old** (by last commit date) → remove
  candidate.
- **OPEN PR exists, or worktree is dirty** → keep. List dirty worktrees
  in a separate "do not touch" section regardless of PR/merge state.

### 4. Local branches merged into origin/dev

```bash
git branch --merged origin/dev
```

Exclude `dev`, `master`, and the current branch. Every remaining name is
a candidate for `git branch -d` (only after its worktree, if any, is
removed first — a branch checked out in a worktree cannot be deleted).
Branches whose PR was squash-merged are refused by `-d` because their
commits are not ancestors of `origin/dev`; list them separately with the
merged PR number and delete with `-D` only after the user explicitly
asks for it.

### 5. Stashes — list only, never auto-drop

```bash
git stash list --format='%gd %cr %s'
```

Print the list. Never run `git stash drop` or `git stash clear`
automatically — each stash removal requires an explicit per-stash yes
from the user in step 7.

### 6. Print the dry-run table and STOP

Print three tables and then stop for confirmation — do not proceed to
step 7 without an explicit go-ahead:

```
Worktree removal candidates
Path | Branch | PR | Status | Last commit

Branch deletion candidates (merged into origin/dev)
Branch | Last commit

Dirty / open-PR worktrees (kept, listed for visibility)
Path | Branch | Reason kept

Stashes (list only)
Ref | Age | Subject
```

### 7. On confirmation, delete only what was confirmed

```bash
git worktree remove <path>          # no --force unless the user explicitly says so
git branch -d <branch>              # -d (safe delete), never -D unless user explicitly says so
git worktree prune
```

Stashes: drop only the specific stash(es) the user names, one at a time
(`git stash drop <ref>`) — never a bulk clear.

## Safety rules

- Never remove the main worktree (the project root) or the worktree Claude Code is currently running in.
- Never remove a dirty worktree (non-empty `git status --porcelain`).
- Never remove a worktree whose branch has an open PR.
- Never pass `--force` to `git worktree remove` or `-D` to `git branch`
  unless the user explicitly asks for it in that turn.
- Never drop a stash without a per-stash yes — no bulk stash operations.
- If GitHub API calls fail (rate limit, auth), report the failure and
  fall back to marking that branch's PR state "unknown" rather than
  guessing merged/open.
