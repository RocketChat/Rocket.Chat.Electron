---
name: ship-release
description: Ship a Rocket.Chat.Electron release end-to-end. Collects merged fixes since the last tag, drafts release notes, bumps the version on a chore/release branch, opens the bump PR, and — after explicit user approval at each gate — merges, tags, monitors the build-release pipeline in the background, and verifies the published release has the full platform asset matrix. Handles alpha (on dev), stable promotion (dev→master), and patch releases (release/X.Y.x). Trigger when the user says "ship release X.Y.Z", "release 4.16.0", "cut a patch release", "promote alpha to stable", or "/ship-release".
---

# Ship Release

Drives a release from "fixes merged on dev" to "published GitHub release
with all platform assets verified". Every irreversible step (merge, tag
push, release publish) is gated on explicit user approval.

## Invocation

- `/ship-release 4.15.2` — explicit target version.
- `/ship-release` — infer next version: patch bump over the latest stable
  tag, or ask if ambiguous.
- Alpha: `/ship-release 4.17.0-alpha.1`. Stable promotion:
  `/ship-release 4.17.0` when the latest tag is `4.17.0-alpha.N`. Patch:
  `/ship-release 4.16.1` when the latest stable tag is `4.16.0`.

## Release types at a glance

| Type | Bump branch cut from | Bump PR targets | Merge method | Tag lands on |
|---|---|---|---|---|
| Alpha `X.Y.0-alpha.N` | fresh `origin/dev` | `dev` | squash | `dev` tip |
| Stable `X.Y.0` | fresh `origin/dev` | `dev`, then a release PR `dev`→`master` | bump: squash; release: **merge commit** (`gh pr merge --merge`) | `master` merge commit |
| Patch `X.Y.Z` | `release/X.Y.x` (cut from tag `X.Y.0` if it doesn't exist yet) | `release/X.Y.x` | squash | `release/X.Y.x` tip |

## Hard rules

- **NEVER merge, tag, or publish without explicit user approval at that
  gate.** Preparing a branch/PR is reversible; merge/tag/publish are not.
- **Stable release PRs (`dev`→`master`) must be merged with a true merge
  commit** (`gh pr merge --merge`), never squash. Squashing forks history
  permanently — `master` stops being a subset of `dev`'s commit graph.
  Every other bump PR (alpha on `dev`, patch on `release/X.Y.x`) still
  squash-merges as usual.
- Tag only AFTER the relevant bump/release PR is merged, and tag the exact
  commit that carries the target version — a tag pointing anywhere else
  ships the wrong tree.
- Tag name is the bare version (`4.15.1`, no `v` prefix) — `build-release.yml`
  triggers only on semver tag pushes, and the auto-updater feed derives from
  `package.json` version, which MUST match the tag.
- Bump PRs squash-merge (history convention: `chore: bump version to X.Y.Z (#NNNN)`).
- All three platform jobs (ubuntu / macos / windows) must be green before
  the release counts as buildable. No partial releases.
- A release without the full asset matrix (below) is NOT done — report
  exactly which assets are missing.
- Monitor CI in the background (`run_in_background` Bash or `watcher`) —
  never block the session polling in foreground.
- Tags always go through `yarn release:tag` (`scripts/release-tag.ts`),
  never a bare `git tag` push. The script is channel-aware: it verifies HEAD
  is an ancestor of the allowed ref for the tag's channel (alpha →
  `origin/dev`; stable/patch → `origin/master` or the matching
  `origin/release/*`) before tagging. An intentional escape hatch,
  `--allow-unverified-ref`, bypasses the ancestor check — only use it with
  explicit user confirmation that the ref is correct.

## Phase 0 — Resolve version & scope

1. Fresh state: `git fetch origin dev master --tags` (also fetch the
   relevant `release/X.Y.x` for a patch).
2. Latest tags, semver-sorted (not by creation date — an alpha or an older
   version created later can otherwise look newest):
   `git tag --sort=-v:refname | head -5`.
3. Resolve TARGET and its type from the arg, or propose one:
   - No pre-release suffix and the latest tag on that `X.Y` line is an
     alpha → **stable promotion**.
   - Next `X.Y.Z+1` after an existing stable tag `X.Y.Z` → **patch**.
   - Next `X.(Y+1).0-alpha.1` after the latest stable tag → **alpha**.
4. Collect what ships:
   - Alpha/stable: `git log <last-tag>..origin/dev --oneline --no-merges`.
   - Patch: `git log <last-tag>..origin/release/X.Y.x --oneline --no-merges`
     plus the cherry-pick candidates still on `dev` only.
   Filter out chore/version-bump commits.
5. If the relevant branch has nothing new since the last tag → STOP and
   tell the user there is nothing to release.

## Phase 1 — Release notes draft

1. Map each shipped commit to its PR (`(#NNNN)` suffix) and pull titles:
   `gh pr view NNNN --json title,labels`.
2. Draft notes grouped as: 🐛 Fixes / ✨ Improvements / 🔧 Internal.
   Straightforward language, what changed and why — no invented metrics.
3. **Customer-facing framing rule applies**: partial-scope fixes are
   "hardening" / "did not cover path X", never "was broken" / "regression".
4. Show the draft to the user. Notes get applied to the GitHub release in
   Phase 5.

## Phase 2 — Bump branch & PR

### Alpha

1. Create the release worktree off fresh `origin/dev` and record its path —
   every command below runs inside it:
   ```sh
   git worktree add ../Rocket.Chat.Electron-worktrees/release-<version> -b chore/release-<version> origin/dev
   RELEASE_WT=$(pwd)/../Rocket.Chat.Electron-worktrees/release-<version>
   cd "$RELEASE_WT"
   ```
2. Bump `"version"` in `package.json` and `mac.bundleVersion` in
   `electron-builder.json` (see `docs/release-process.md` for the
   `bundleVersion` format/increment rule).
3. **GATE: show the diff and STOP for explicit user approval** before the
   first commit + push.
4. Commit `chore: bump version to <version>`, push, open a PR to **`dev`**.
5. Wait for `validate-pr` checks. **GATE: show PR URL + checks status. STOP
   until the user says merge.**
6. Squash-merge: `gh pr merge <PR> --squash`. Branch protection requires 1
   approving review, so this typically needs `--admin` (the release manager
   has bypass) — otherwise `gh pr merge` refuses with "requirements have not
   been met".

### Stable (promotion)

1. Same worktree setup as alpha, off fresh `origin/dev`.
2. Bump `"version"` in `package.json` to the bare version (drop the
   pre-release suffix, e.g. `4.17.0-alpha.6` → `4.17.0`).
3. **GATE**, commit, push, open a bump PR to **`dev`**. Wait for checks.
   **GATE: STOP until the user says merge.** Squash-merge (branch protection
   requires 1 approving review, so this typically needs `--admin`).
4. `git -C "$RELEASE_WT" fetch origin dev` and confirm the merge commit is
   HEAD of `origin/dev` with `package.json` at TARGET.
5. Open the **release PR**: `dev` → `master`
   (`gh pr create --base master --head dev --title "chore: release <version>"`),
   body = the shipped-changes list from Phase 1. **GATE: show PR URL +
   checks status. STOP until the user explicitly approves the promotion
   merge** — this is the point where history becomes irreversible.

### Patch

1. Ensure the patch line exists, cut from the stable tag it patches:
   ```sh
   git fetch origin --tags
   git ls-remote --heads origin release/<X.Y.x> # check if it already exists
   # if missing:
   git worktree add ../Rocket.Chat.Electron-worktrees/release-<X.Y.x> -b release/<X.Y.x> <X.Y.0>
   git push origin release/<X.Y.x>
   ```
2. Cherry-pick the target fixes from `dev` onto the release branch (in a
   worktree checked out to `release/<X.Y.x>`):
   ```sh
   git cherry-pick <fix-commit-sha> [...]
   ```
   **GATE: show the cherry-picked commits and STOP for approval** before
   pushing.
3. Bump `"version"` in `package.json` to `X.Y.Z`, commit, push a bump PR
   targeting **`release/<X.Y.x>`**. Wait for checks. **GATE: STOP until the
   user says merge.** Squash-merge (branch protection requires 1 approving
   review, so this typically needs `--admin`).

## Phase 3 — Merge & tag

All commands in this phase run inside `$RELEASE_WT` (`git -C "$RELEASE_WT" ...`
or stay `cd`'d in) — never in the user's own checkout.

### Alpha

1. `git -C "$RELEASE_WT" fetch origin dev` and confirm the squash-merge
   commit is HEAD of `origin/dev` with `package.json` at TARGET.
2. **GATE: confirm with the user before pushing the tag.**
3. Detach onto the `dev` tip and tag:
   ```sh
   MERGE_SHA=$(git -C "$RELEASE_WT" rev-parse origin/dev)
   git -C "$RELEASE_WT" checkout "$MERGE_SHA"
   node -p "require('$RELEASE_WT/package.json').version"   # MUST print TARGET
   (cd "$RELEASE_WT" && yarn release:tag)
   ```

### Stable

1. **After** the Phase 2 release PR is approved by the user, merge it with a
   **true merge commit — never squash**:
   ```sh
   gh pr merge <RELEASE_PR> --merge
   ```
   Branch protection requires 1 approving review, so this typically needs
   `--admin` (the release manager has bypass) — otherwise `gh pr merge`
   refuses with "requirements have not been met".
2. `git -C "$RELEASE_WT" fetch origin master` and confirm the merge commit
   is HEAD of `origin/master` and its `package.json` has TARGET.
3. **GATE: confirm with the user before pushing the tag.**
4. Detach onto the `master` merge commit and tag:
   ```sh
   MERGE_SHA=$(git -C "$RELEASE_WT" rev-parse origin/master)
   git -C "$RELEASE_WT" checkout "$MERGE_SHA"
   node -p "require('$RELEASE_WT/package.json').version"   # MUST print TARGET
   (cd "$RELEASE_WT" && yarn release:tag)
   ```

### Patch

1. `git -C "$RELEASE_WT" fetch origin release/<X.Y.x>` and confirm the
   squash-merge commit is HEAD of `origin/release/<X.Y.x>` with
   `package.json` at TARGET.
2. **GATE: confirm with the user before pushing the tag.**
3. Detach onto the release-branch tip and tag:
   ```sh
   MERGE_SHA=$(git -C "$RELEASE_WT" rev-parse origin/release/<X.Y.x>)
   git -C "$RELEASE_WT" checkout "$MERGE_SHA"
   node -p "require('$RELEASE_WT/package.json').version"   # MUST print TARGET
   (cd "$RELEASE_WT" && yarn release:tag)
   ```

### All types

`yarn release:tag` (`scripts/release-tag.ts`) reads the version from
`package.json`, runs the channel-aware ancestor guard, refuses if the tag
already exists or isn't greater than the latest tag in-channel, then tags
the current HEAD as the bare version and pushes it. It prompts
`Proceed? (y/N)` — pipe `y` for non-interactive (`echo y | yarn release:tag`).

- **node_modules required**: a fresh worktree has none, so `yarn release:tag`
  fails with `Couldn't find the node_modules state file (findPackageLocation)`.
  Run `yarn install` in the worktree first, or replicate the script's exact
  guard by hand (fail closed) if a fast tag is unavoidable:
  ```sh
  cd "$RELEASE_WT"
  if git rev-parse -q --verify "refs/tags/<version>" >/dev/null; then
    echo "TAG EXISTS — abort" >&2
    exit 1
  fi
  git tag -- <version>
  test "$(git rev-list -1 <version>)" = "$MERGE_SHA" || { echo "tag does not point at merge SHA — abort" >&2; exit 1; }
  git push origin refs/tags/<version>
  ```
- The tag push is the **only** trigger for `build-release.yml` — branch
  pushes to `dev`/`master`/`release/*` no longer start a release build.
  Find the run: `gh run list --workflow=build-release.yml --limit 5 --json databaseId,headBranch,status`
  (the release run's `headBranch` is the tag ref itself).

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
4. Alphas: mark prerelease (`gh release edit <version> --prerelease`) **while still a draft** — do this before the publish gate, never after, so the alpha is never briefly visible to stable clients.
5. If the release is a draft: **GATE — ask before publishing** (`gh release edit <version> --draft=false`). Publishing exposes the update feed (`latest*.yml`) to every installed client — this is the point of no return for auto-update.

## Phase 6 — Wrap up

1. Report: release URL, asset count, platforms green.
2. Cleanup: remove the release worktree (`git worktree remove ../Rocket.Chat.Electron-worktrees/release-<version>`).
3. **Stable only**: confirm `dev`'s `package.json` still equals TARGET (the
   version invariant) — it should, since the bump happened on `dev` before
   promotion.
4. **Patch only**: remind the user that if this fix was authored directly on
   the release branch (not cherry-picked from `dev`), it must be
   forward-ported to `dev` via a small cherry-pick PR — the one exception to
   the never-back-merge rule.
5. Optional (ask): transition linked Jira tickets to Done (desktop tickets: assignee Jean, component Electron) and comment the release URL on shipped PRs.

## Failure modes

| Symptom | Likely cause | Action |
|---|---|---|
| Tag run missing from `gh run list` | Tag pushed before merge, or push rejected | Verify tag exists on remote and points at the correct branch's HEAD |
| Windows job fails at signing/MSI | KMS CNG provider conflict (two-phase signing) | Read `--log-failed`; usually re-run, not code |
| macOS job stuck >1h at notarize | Apple notarization queue | Wait; stall threshold 2h before escalating |
| Release exists but assets partial | One platform job failed after others published | Fix/re-run failed job; electron-builder appends to same release |
| `latest*.yml` version ≠ tag | package.json bump missed before tag | Critical — auto-updater breaks; delete release+tag, redo from Phase 2 |
| `yarn release:tag` guard rejects HEAD | Tagging from the wrong branch for the channel (e.g. tagging a stable off `dev` directly, or an alpha off a `release/*` branch) | Re-verify you're on the correct branch/commit; only use `--allow-unverified-ref` with explicit user confirmation |
| Release PR (`dev`→`master`) accidentally squashed | Wrong merge method selected in the merge dialog/CLI | Irreversible — history has forked; escalate to the user immediately, do not attempt to "fix" it by force-pushing `master` |
