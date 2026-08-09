---
name: ship-release
description: Ship a Rocket.Chat.Electron release end-to-end. Collects merged fixes since the last tag, drafts release notes, bumps the version on a chore/release branch, opens the bump PR, and — after explicit user approval at each gate — merges, tags, monitors the build-release pipeline in the background, and verifies the published release has the full platform asset matrix. Handles stable, patch, and alpha releases plus alpha→stable promotion. Trigger when the user says "ship release X.Y.Z", "release 4.16.0", "cut a patch release", "promote alpha to stable", or "/ship-release".
---

# Ship Release

Drives a release from "fixes merged on master" to "published GitHub release with all platform assets verified". Every irreversible step (merge, tag push, release publish) is gated on explicit user approval.

## Invocation

- `/ship-release 4.15.2` — explicit target version.
- `/ship-release` — infer next version: patch bump over the latest stable tag, or ask if ambiguous.
- Alpha: `/ship-release 4.16.0-alpha.0`. Promotion: `/ship-release 4.16.0` when latest tag is `4.16.0-alpha.N`.

## Hard rules

- **NEVER merge, tag, or publish without explicit user approval at that gate.** Preparing a branch/PR is reversible; merge/tag/publish are not.
- Release branch is always `chore/release-<version>` cut from **fresh `origin/master`** — never from dev, never from a stale local master.
- Tag only AFTER the bump PR is merged, and tag the **merge commit on master** — a tag pointing anywhere else ships the wrong tree.
- Tag name is the bare version (`4.15.1`, no `v` prefix) — `build-release.yml` triggers on any tag push, and the auto-updater feed derives from `package.json` version, which MUST match the tag.
- Bump PRs squash-merge (history convention: `chore: bump version to X.Y.Z (#NNNN)`).
- All three platform jobs (ubuntu / macos / windows) must be green before the release counts as buildable. No partial releases.
- A release without the full asset matrix (below) is NOT done — report exactly which assets are missing.
- Monitor CI in the background (`run_in_background` Bash or `watcher`) — never block the session polling in foreground.

## Phase 0 — Resolve version & scope

1. Fresh state: `git fetch origin master --tags`.
2. Latest tags: `git tag --sort=-creatordate | head -5`. Current version: `node -p "require('./package.json').version"`.
3. Resolve TARGET from the arg, or propose: patch bump over latest stable tag. If latest tag is an alpha of the same version, this is a **promotion** (drop the `-alpha.N` suffix).
4. Collect what ships: `git log <last-tag>..origin/master --oneline --no-merges`. Filter out chore/version-bump commits.
5. If master has nothing new since the last tag → STOP and tell the user there is nothing to release.

## Phase 1 — Release notes draft

1. Map each shipped commit to its PR (`(#NNNN)` suffix) and pull titles: `gh pr view NNNN --json title,labels`.
2. Draft notes grouped as: 🐛 Fixes / ✨ Improvements / 🔧 Internal. Straightforward language, what changed and why — no invented metrics.
3. **Customer-facing framing rule applies**: partial-scope fixes are "hardening" / "did not cover path X", never "was broken" / "regression".
4. Show the draft to the user. Notes get applied to the GitHub release in Phase 5.

## Phase 2 — Bump branch & PR

1. Prefer a worktree so the user's working directory is untouched:
   `git worktree add ../Rocket.Chat.Electron-worktrees/release-<version> -b chore/release-<version> origin/master`
2. Bump `"version"` in `package.json` (root, ~line 9). Nothing else — no lockfile change needed for a version bump.
3. Commit: `chore: bump version to <version>` and push the branch.
4. Open PR to **master** titled `chore: bump version to <version>`, body = the shipped-changes list from Phase 1. No `build-artifacts` label (release build comes from the tag, not the PR).
5. Wait for `validate-pr` checks (lint + tests on all 3 platforms).
6. **GATE: show PR URL + checks status. STOP until the user says merge.**

## Phase 3 — Merge & tag

1. Squash-merge: `gh pr merge <PR> --squash`.
2. `git fetch origin master` and confirm the merge commit is HEAD of `origin/master` and its `package.json` has TARGET.
3. **GATE: confirm with the user before pushing the tag** (tag push = build + release creation; deleting a tag after builds start is messy).
4. Move the release worktree HEAD onto the master merge commit, then tag via the repo script. The release worktree is still on `chore/release-<version>` (the pre-merge bump commit) — tagging there ships the wrong tree. Detach onto the squashed merge commit first (its `package.json` version must equal TARGET):
   ```
   MERGE_SHA=$(git rev-parse origin/master)
   git checkout "$MERGE_SHA"          # detached HEAD at the merge commit
   node -p "require('./package.json').version"   # MUST print TARGET
   yarn release:tag                    # reads package.json version, guards, tags HEAD, pushes
   ```
   `yarn release:tag` (`scripts/release-tag.ts`) reads the version from `package.json`, refuses if the tag already exists or isn't greater than the latest tag in-channel, then tags the current HEAD as the bare version and pushes it. It prompts `Proceed? (y/N)` — pipe `y` for non-interactive (`echo y | yarn release:tag`).
   - **node_modules required**: a fresh worktree has none, so `yarn release:tag` fails with `Couldn't find the node_modules state file (findPackageLocation)`. Either run `yarn install` in the worktree first, or run the script's exact equivalent by hand after verifying its guards yourself:
     ```
     git tag -l <version> | grep -q . && echo "TAG EXISTS — abort" || git tag -- <version>
     git rev-list -1 <version>            # confirm it points at the merge SHA
     git push origin refs/tags/<version>
     ```
5. Note: the master push (bump merge) also triggers `build-release.yml` — that run is a master build, NOT the release run. The release run is the one with `head_branch == <version>` (the tag ref). Find it: `gh run list --workflow=build-release.yml --limit 5 --json databaseId,headBranch,status`.

## Phase 4 — Monitor pipeline

1. Poll the tag run in the background: `gh run view <run-id> --json status,conclusion,jobs`. Full matrix typically takes 40–90 min; macOS is usually last (notarization).
2. On failure: `gh run view <run-id> --log-failed`, report the verbatim error and which platform broke. Known trap (CLAUDE.md): Windows signing is two-phase Google Cloud KMS — MSI failures often trace to KMS CNG provider conflicts.
3. A failed single job can sometimes be re-run: `gh run rerun <run-id> --failed` — ask the user first.
4. Do not report progress on every poll; surface only completion, failure, or a stall (>2h).

## Phase 5 — Verify release & publish

1. `gh release view <version> --json name,isDraft,url,assets`.
2. Assert the full asset matrix — missing entries = release NOT done:

   | Platform | Expected assets |
   |---|---|
   | macOS | `-mac.dmg` (+`.blockmap`), `-mac.pkg`, `-mac.zip`, `-mas.pkg`, `latest-mac.yml` |
   | Windows | x64/ia32/arm64 × (`.exe` +`.blockmap`, `.msi`, `.appx`), universal `-win.exe` (+`.blockmap`), `latest.yml` |
   | Linux | `.deb`, `.rpm`, `.snap`, `.AppImage`, `.tar.gz`, `latest-linux.yml` |

   (4.15.1 reference: 27 assets total.)
3. Apply the Phase 1 release notes: `gh release edit <version> --notes-file <file>`.
4. If the release is a draft: **GATE — ask before publishing** (`gh release edit <version> --draft=false`). Publishing exposes the update feed (`latest*.yml`) to every installed client — this is the point of no return for auto-update.
5. Alphas: mark prerelease (`--prerelease`) so stable clients don't pick them up.

## Phase 6 — Wrap up

1. Report: release URL, asset count, platforms green.
2. Cleanup: remove the release worktree (`git worktree remove ../Rocket.Chat.Electron-worktrees/release-<version>`).
3. Optional (ask): transition linked Jira tickets to Done (desktop tickets: assignee Jean, component Electron) and comment the release URL on shipped PRs.

## Failure modes

| Symptom | Likely cause | Action |
|---|---|---|
| Tag run missing from `gh run list` | Tag pushed before merge, or push rejected | Verify tag exists on remote and points at master HEAD |
| Windows job fails at signing/MSI | KMS CNG provider conflict (two-phase signing) | Read `--log-failed`; usually re-run, not code |
| macOS job stuck >1h at notarize | Apple notarization queue | Wait; stall threshold 2h before escalating |
| Release exists but assets partial | One platform job failed after others published | Fix/re-run failed job; electron-builder appends to same release |
| `latest*.yml` version ≠ tag | package.json bump missed before tag | Critical — auto-updater breaks; delete release+tag, redo from Phase 2 |
