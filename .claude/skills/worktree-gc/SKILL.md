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

For each worktree with a branch (skip detached ones here), a
GitHub-merged PR is the authority for "merged" — not
`git branch --merged` (see step 4), since a squash-merged branch's
commits never become ancestors of `dev`/`master`:

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

### 4. Local branches merged (ancestor merge or squash-merged PR)

```bash
git branch --merged origin/dev
git branch --merged origin/master
```

Some work in this repo predates the dev/master branching model (see
`docs/pre-release-process.md` or other branching docs if present) — check
both refs and union the results. Exclude `dev`, `master`, and the current
branch. Every remaining name is an ancestor-merge candidate for
`git branch -d` (only after its worktree, if any, is removed first — a
branch checked out in a worktree cannot be deleted).

`git branch --merged` only catches ancestor (fast-forward/merge-commit)
merges — it misses squash-merged branches, whose commits never become
ancestors of `dev`/`master`. To catch those, scan every remaining local
branch NOT already found in step 4's union with `gh pr list --state
merged --head <b>`. This costs one API call per branch; prefer batching
instead — pull merged PRs once and match branch names locally:

```bash
gh pr list --state merged --limit 200 --json headRefName,number --repo RocketChat/Rocket.Chat.Electron
```

This returns a flat JSON array, e.g.:

```json
[
  { "headRefName": "lingohub_language_update_2026-08-17Z", "number": 3459 },
  { "headRefName": "saml-deeplink-auth", "number": 3458 }
]
```

Match each remaining local branch's name against `headRefName`; a match
is a squash-merge candidate for `git branch -D` with the PR number
recorded. If a local branch isn't found in this list (e.g. >200 merged
PRs back), fall back to the per-branch `gh pr list --state merged --head
<b>` call for that branch only.

### 5. Stashes — list only, never auto-drop

```bash
git stash list --format='%gd %cr %s'
```

Print the list. Never run `git stash drop` or `git stash clear`
automatically — each stash removal requires an explicit per-stash yes
from the user in step 7.

**Archive before drop**: for any stash the user approves dropping,
archive it first so the diff isn't lost:

```bash
mkdir -p .localdev/archive
git stash show -p --include-untracked <ref> > .localdev/archive/stash-<n>-<slug>.patch
```

`--include-untracked` requires a git version that supports it — check
with `git stash show -h` (look for `-u, --[no-]include-untracked` in the
usage output) before relying on it; on an older git, drop the flag and
note in the archive that untracked files were not captured.

### 6. Print the dry-run table and STOP

Print three tables and then stop for confirmation — do not proceed to
step 7 without an explicit go-ahead:

```
Worktree removal candidates
Path | Branch | PR | Status | Last commit

Branch deletion candidates
Branch | Last commit | Delete mode

Dirty / open-PR worktrees (kept, listed for visibility)
Path | Branch | Reason kept

Stashes (list only)
Ref | Age | Subject
```

`Delete mode` is `-d` for a branch that's an ancestor of `dev`/`master`
(step 4 union) or `-D (squash-merged PR #n)` for a branch matched only
via the merged-PR scan. Never put `-D` in this column without a merged
PR number backing it.

### 7. On confirmation, delete only what was confirmed

The table itself is the explicit ask for `-D` on the rows marked that
way — printing a `-D (squash-merged PR #n)` row and getting the user's
go-ahead on the table satisfies the "explicit ask" requirement for that
branch; no separate confirmation step is needed beyond the one in step 6.

```bash
git worktree remove <path>          # no --force unless the user explicitly says so
git branch -d <branch>              # ancestor-merge rows
git branch -D <branch>              # squash-merged rows only, PR number must be in the table
git worktree prune
```

Never use `-D` on a branch that isn't in the table with a merged PR
number attached.

Stashes: drop only the specific stash(es) the user names, one at a time,
archiving first per step 5 (`Archive before drop`), then
`git stash drop <ref>` — never a bulk clear.

## Safety rules

- Never remove the main worktree (the project root) or the worktree Claude Code is currently running in.
- Never remove a dirty worktree (non-empty `git status --porcelain`).
- Never remove a worktree whose branch has an open PR.
- Never pass `--force` to `git worktree remove`. `-D` is allowed only for
  a branch listed in the step 6 table with a merged PR number in its
  `Delete mode` column — the user's confirmation of that table is the
  explicit ask; never run `-D` on a branch absent from the table.
- Never drop a stash without a per-stash yes, and archive it (step 5)
  before dropping — no bulk stash operations.
- If GitHub API calls fail (rate limit, auth), report the failure and
  fall back to marking that branch's PR state "unknown" rather than
  guessing merged/open.
