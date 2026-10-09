---
name: ship-release
description: Ship a Rocket.Chat.Electron release end-to-end. Collect the merged fixes since the last tag, draft release notes, bump the version on a chore/release branch, and open the bump PR. After explicit user approval at each gate, merge and tag. Then monitor the build-release pipeline in the background and check that the published release has the full platform asset matrix. Handles alpha (on dev), stable promotion (dev→master), and patch releases (release/X.Y.x). Trigger when the user says "ship release X.Y.Z", "release 4.16.0", "cut a patch release", "promote alpha to stable", or "/ship-release".
---

# Ship Release

This skill drives a release from "fixes merged on dev" to "published GitHub
release with all platform assets checked". The user must approve each
irreversible step (merge, tag push, release publish) explicitly.

## Invocation

- `/ship-release 4.15.2` — explicit target version.
- `/ship-release` — infer the next version: a patch bump over the latest
  stable tag. Ask the user when the version is ambiguous.
- Alpha: `/ship-release 4.17.0-alpha.1`. Stable promotion:
  `/ship-release 4.17.0` when the latest tag is `4.17.0-alpha.N`. Patch:
  `/ship-release 4.16.1` when the latest stable tag is `4.16.0`.

## Release types at a glance

| Type                  | Bump branch cut from                                           | Bump PR targets                         | Merge method                                                        | Tag lands on          |
| --------------------- | -------------------------------------------------------------- | --------------------------------------- | ------------------------------------------------------------------- | --------------------- |
| Alpha `X.Y.0-alpha.N` | fresh `origin/dev`                                             | `dev`                                   | squash                                                              | `dev` tip             |
| Stable `X.Y.0`        | fresh `origin/dev`                                             | `dev`, then a release PR `dev`→`master` | bump PR squash, release PR **merge commit** (`gh pr merge --merge`) | `master` merge commit |
| Patch `X.Y.Z`         | `release/X.Y.x` (cut from tag `X.Y.0` if it doesn't exist yet) | `release/X.Y.x`                         | squash                                                              | `release/X.Y.x` tip   |

## Hard rules

- **NEVER merge, tag, or publish without explicit user approval at that
  gate.** You can undo the preparation of a branch or PR. You cannot undo a
  merge, a tag, or a publish.
- **Merge a stable release PR (`dev`→`master`) with a true merge commit**
  (`gh pr merge --merge`), and NEVER squash it. A squash forks history
  permanently, and `master` stops being a subset of `dev`'s commit graph.
  Every other bump PR (alpha on `dev`, patch on `release/X.Y.x`) still
  squash-merges as usual.
- Tag only AFTER the relevant bump or release PR is merged. Tag the exact
  commit that carries the target version. A tag on any other commit ships
  the wrong tree.
- The tag name is the bare version (`4.15.1`, no `v` prefix).
  `build-release.yml` triggers only on semver tag pushes. The auto-updater
  feed derives from the `package.json` version, which MUST match the tag.
- Squash-merge bump PRs. The history convention is
  `chore: bump version to X.Y.Z (#NNNN)`.
- All seven build jobs of `build-release.yml` must be green before the
  release counts as buildable. No partial releases.
- A release without the full asset matrix (below) is NOT done. Report
  exactly which assets are missing.
- The rules above are the complete blocker list. Put untranslated
  non-English strings and manual Windows or Linux spot checks in the report
  as notes. They block only when the user names them as blockers.
- Monitor CI in the background (`run_in_background` Bash or `watcher`).
  NEVER block the session with foreground polling.
- Create tags with `yarn release:tag` (`scripts/release-tag.ts`).
  NEVER use a bare `git tag` push. The script is channel-aware. Before it
  tags, it checks that HEAD is an ancestor of the allowed ref for the tag's
  channel. An alpha uses `origin/dev`. A stable or patch uses `origin/master`
  or the matching `origin/release/*`. The escape hatch
  `--allow-unverified-ref` bypasses the ancestor check. Use it only when the
  user states explicitly that the ref is right.

## Phase 0 — Resolve version & scope

1. Fetch fresh state: `git fetch origin dev master --tags`. For a patch,
   also fetch the relevant `release/X.Y.x`.
2. List the latest tags, sorted by semver and not by creation date. An alpha
   or an older version created later can otherwise look newest:
   `git -c versionsort.suffix=- tag --list '[0-9]*' --sort=-v:refname | head -5`.
   The `[0-9]*` filter drops the legacy `v4.12.1-alpha.*` and `release-test`
   tags. A plain version sort ranks them above every real release. The
   suffix setting ranks `4.17.0` above `4.17.0-alpha.3`.
3. Resolve TARGET and its type from the argument, or propose one:
   - No pre-release suffix and the latest tag on that `X.Y` line is an
     alpha → **stable promotion**.
   - Next `X.Y.Z+1` after an existing stable tag `X.Y.Z` → **patch**.
   - Next `X.(Y+1).0-alpha.1` after the latest stable tag → **alpha**.
4. Collect what ships:
   - Alpha/stable: `git log <last-tag>..origin/dev --oneline --no-merges`.
   - Patch: `git log <last-tag>..origin/release/X.Y.x --oneline --no-merges`
     plus the cherry-pick candidates that are still only on `dev`.
     Filter out chore/version-bump commits.
5. If the relevant branch has nothing new since the last tag → STOP and
   tell the user that there is nothing to release.

## Phase 1 — Release notes draft

1. Map each shipped commit to its PR (`(#NNNN)` suffix) and pull the titles:
   `gh pr view NNNN --json title,labels`.
2. Draft the notes in these groups: 🐛 Fixes / ✨ Improvements / 🔧 Internal.
   Use straightforward language. Say what changed and why. Invent no metrics.
3. **Apply the customer-facing framing rule**: describe a partial-scope fix
   as "hardening" or "did not cover path X". Never write "was broken" or
   "regression".
4. Show the draft to the user. Phase 5 applies the notes to the GitHub
   release.

## Phase 2 — Bump branch & PR

### Alpha

1. Create the release worktree off fresh `origin/dev` and record its path.
   Every command below runs inside it:
   ```sh
   git worktree add ../Rocket.Chat.Electron-worktrees/release-<version> -b chore/release-<version> origin/dev
   RELEASE_WT=$(pwd)/../Rocket.Chat.Electron-worktrees/release-<version>
   cd "$RELEASE_WT"
   ```
2. Bump `"version"` in `package.json` and `mac.bundleVersion` in
   `electron-builder.json`. See `docs/release-process.md` for the
   `bundleVersion` format and increment rule.
3. **GATE: show the diff and STOP for explicit user approval** before the
   first commit and push.
4. Commit `chore: bump version to <version>`, push, and open a PR to **`dev`**.
5. Wait for the `validate-pr` checks. **GATE: show the PR URL and the checks
   status. STOP until the user says merge.**
6. Squash-merge: `gh pr merge <PR> --squash`. Branch protection requires 1
   approving review, so this typically needs `--admin` (the release manager
   has bypass). Without it, `gh pr merge` refuses with "requirements have
   not been met".

### Stable (promotion)

0. The stable promotion needs a QA go from the `release-qa-plan` skill on
   the newest prerelease. Run
   `node skills/release-qa-plan/collect-changes.mjs --check qa/release-<TARGET>`.
   If it fails, or the go/no-go report is not a go, stop and tell the user.
1. Use the same worktree setup as alpha, off fresh `origin/dev`.
2. Bump `"version"` in `package.json` to the bare version. Drop the
   pre-release suffix, for example `4.17.0-alpha.6` → `4.17.0`.
3. **GATE**, commit, push, and open a bump PR to **`dev`**. Wait for the
   checks. **GATE: STOP until the user says merge.** Squash-merge. Branch
   protection requires 1 approving review, so this typically needs
   `--admin`.
4. Run `git -C "$RELEASE_WT" fetch origin dev`. Check that the merge commit
   is HEAD of `origin/dev` with `package.json` at TARGET.
5. Open the **release PR** `dev` → `master`
   (`gh pr create --base master --head dev --title "chore: release <version>"`).
   Use the shipped-changes list from Phase 1 as the body. **GATE: show the PR
   URL and the checks status. STOP until the user explicitly approves the
   promotion merge.** History becomes irreversible at this point.

### Patch

1. Make sure that the patch line exists. Cut it from the stable tag that it
   patches:
   ```sh
   git fetch origin --tags
   git ls-remote --heads origin release/<X.Y.x> # check if it already exists
   RELEASE_WT=$(pwd)/../Rocket.Chat.Electron-worktrees/release-<X.Y.x>
   # if missing:
   git worktree add "$RELEASE_WT" -b release/<X.Y.x> <X.Y.0>
   git push origin release/<X.Y.x>
   # if it already exists:
   git fetch origin release/<X.Y.x>
   git worktree add "$RELEASE_WT" -b release/<X.Y.x> origin/release/<X.Y.x>
   ```
   Run every command below inside `$RELEASE_WT`.
2. Cherry-pick the target fixes from `dev` onto the release branch, in a
   worktree checked out to `release/<X.Y.x>`:
   ```sh
   git cherry-pick <fix-commit-sha> [...]
   ```
   **GATE: show the cherry-picked commits and STOP for approval** before
   the push.
3. Bump `"version"` in `package.json` to `X.Y.Z`, commit, and push a bump PR
   that targets **`release/<X.Y.x>`**. Wait for the checks.
   **GATE: STOP until the user says merge.** Squash-merge. Branch protection
   requires 1 approving review, so this typically needs `--admin`.

## Phase 3 — Merge & tag

Run all commands in this phase inside `$RELEASE_WT`
(`git -C "$RELEASE_WT" ...`, or stay `cd`'d in). NEVER run them in the
user's own checkout.

### Alpha

1. Run `git -C "$RELEASE_WT" fetch origin dev`. Check that the squash-merge
   commit is HEAD of `origin/dev` with `package.json` at TARGET.
2. **GATE: ask the user for confirmation before the tag push.**
3. Detach onto the `dev` tip and tag:
   ```sh
   MERGE_SHA=$(git -C "$RELEASE_WT" rev-parse origin/dev)
   git -C "$RELEASE_WT" checkout "$MERGE_SHA"
   node -p "require('$RELEASE_WT/package.json').version"   # MUST print TARGET
   (cd "$RELEASE_WT" && yarn release:tag)
   ```

### Stable

1. **After** the user approves the Phase 2 release PR, merge it with a
   **true merge commit — never squash**:
   ```sh
   gh pr merge <RELEASE_PR> --merge
   ```
   Branch protection requires 1 approving review, so this typically needs
   `--admin` (the release manager has bypass). Without it, `gh pr merge`
   refuses with "requirements have not been met".
2. Run `git -C "$RELEASE_WT" fetch origin master`. Check that the merge
   commit is HEAD of `origin/master` and that its `package.json` has TARGET.
3. **GATE: ask the user for confirmation before the tag push.**
4. Detach onto the `master` merge commit and tag:
   ```sh
   MERGE_SHA=$(git -C "$RELEASE_WT" rev-parse origin/master)
   git -C "$RELEASE_WT" checkout "$MERGE_SHA"
   node -p "require('$RELEASE_WT/package.json').version"   # MUST print TARGET
   (cd "$RELEASE_WT" && yarn release:tag)
   ```

### Patch

1. Run `git -C "$RELEASE_WT" fetch origin release/<X.Y.x>`. Check that the
   squash-merge commit is HEAD of `origin/release/<X.Y.x>` with
   `package.json` at TARGET.
2. **GATE: ask the user for confirmation before the tag push.**
3. Detach onto the release-branch tip and tag:
   ```sh
   MERGE_SHA=$(git -C "$RELEASE_WT" rev-parse origin/release/<X.Y.x>)
   git -C "$RELEASE_WT" checkout "$MERGE_SHA"
   node -p "require('$RELEASE_WT/package.json').version"   # MUST print TARGET
   (cd "$RELEASE_WT" && yarn release:tag)
   ```

### All types

`yarn release:tag` (`scripts/release-tag.ts`) does these things:

1. It reads the version from `package.json`.
2. It runs the channel-aware ancestor guard.
3. It refuses when the tag already exists or is not greater than the latest
   tag in its channel.
4. It tags the current HEAD as the bare version and pushes the tag.

It prompts `Proceed? (y/N)`. For a non-interactive run, pass the `--yes`
flag (`yarn release:tag --yes`). Piping `y` is unreliable because the prompt
reads a real TTY. See `docs/release-process.md` for the full guard table.

- **node_modules required**: a fresh worktree has none, so `yarn release:tag`
  fails with `Couldn't find the node_modules state file (findPackageLocation)`.
  Run `yarn install` in the worktree first. Never tag by hand to work around
  it: a manual tag skips the ancestor and channel guards.
- The tag push is the **only** trigger for `build-release.yml`. Branch
  pushes to `dev`/`master`/`release/*` do not start a release build.
  Find the run:
  `gh run list --workflow=build-release.yml --limit 5 --json databaseId,headBranch,status`
  (the `headBranch` of the release run is the tag ref itself).

## Phase 4 — Monitor pipeline

1. Poll the tag run in the background:
   `gh run view <run-id> --json status,conclusion,jobs`. The workflow has a
   `prepare` job and seven build jobs (`windows-nsis`, `windows-msi`,
   `windows-appx`, `macos-dmg`, `macos-mas`, `linux-appimage`, `linux-snap`).
   The full matrix typically takes 40–90 min. The macOS jobs are usually last
   (notarization).
2. On failure, run `gh run view <run-id> --log-failed`. Report the verbatim
   error and the job that broke. Known trap (`AGENTS.md`, "Patches And
   Builds"): Windows signing is two-phase Google Cloud KMS. MSI failures often
   trace to KMS CNG provider conflicts.
3. You can sometimes re-run a single failed job:
   `gh run rerun <run-id> --failed`. Ask the user first.
4. Do not report progress on every poll. Report only completion, failure, or
   a stall (>2h).

## Phase 4b — Re-tag an unpublished release

Use this phase when the release is **still a draft** and the tag run fails.
The cause needs a code or config change on the release branch. Examples are
a CI/toolchain regression and a bump mistake. The build workflow fires only
on tag pushes, so the fix cannot reach the pipeline without a new tag. Reuse
of the same version keeps the version history clean (no dead `X.Y.Z` tag with
no release).

Check each precondition. Abort if any one fails:

1. `gh release view <version> --json isDraft -q .isDraft` prints `true`.
   **NEVER re-tag a published release.** Clients may already have fetched
   `latest*.yml` for it. Ship the next patch version instead.
2. The old tag run is not `in_progress`
   (`gh run view <run-id> --json status`). If it is, run
   `gh run cancel <run-id>` first. Otherwise it recreates the draft after you
   delete it.
3. **GATE: ask for explicit user approval to delete the draft and the remote
   tag.**

Procedure (in `$RELEASE_WT`):

```sh
# 1. land the fix on the release branch (PR + squash-merge as in Phase 2),
#    then fetch the new tip
git -C "$RELEASE_WT" fetch origin <branch>

# 2. remove the draft release and the tag (remote and local)
gh release delete <version> --yes
git push origin :refs/tags/<version>
git -C "$RELEASE_WT" tag -d <version> 2>/dev/null || true
gh release view <version> 2>&1 | grep -q 'release not found' || { echo "draft still exists"; exit 1; }
git ls-remote --tags origin <version> | grep -q . && { echo "remote tag still exists"; exit 1; }

# 3. tag the new tip exactly as in Phase 3
MERGE_SHA=$(git -C "$RELEASE_WT" rev-parse origin/<branch>)
git -C "$RELEASE_WT" checkout "$MERGE_SHA"
node -p "require('$RELEASE_WT/package.json').version"   # MUST print TARGET
(cd "$RELEASE_WT" && yarn release:tag --yes)
```

`yarn release:tag` refuses an existing tag with no override. Finish step 2
before step 3. If the refusal still fires, the remote tag deletion did not
land. Then continue with Phase 4 on the new run. `gh release delete` without
`--cleanup-tag` leaves the tag alone, which is why the procedure deletes the
tag explicitly. Keep the two steps separate, so that a failed release
deletion never leaves a tag on the old commit.

If you wrote the fix directly on a `release/X.Y.x` branch, forward-port it to
`dev` with a cherry-pick PR (Phase 6 step 4). Otherwise a toolchain fix like
this also breaks the next `dev` release. A fix for a stable tag on `master`
lands on `dev` first. NEVER back-merge `master` into `dev`.

## Phase 5 — Check release & publish

1. Run `gh release view <version> --json name,isDraft,url,assets`.
2. Assert the full asset matrix. A missing entry means the release is NOT
   done:

   | Platform | Expected assets                                                                                            |
   | -------- | ---------------------------------------------------------------------------------------------------------- |
   | macOS    | `-mac.dmg` (+`.blockmap`), `-mac.pkg`, `-mac.zip`, `-mas.pkg`, `latest-mac.yml`                            |
   | Windows  | x64/ia32/arm64 × (`.exe` +`.blockmap`, `.msi`, `.appx`), universal `-win.exe` (+`.blockmap`), `latest.yml` |
   | Linux    | `.deb`, `.rpm`, `.snap`, `.AppImage`, `.tar.gz`, `latest-linux.yml`                                        |

   (4.15.1 reference: 27 assets total.)

3. Apply the Phase 1 release notes: `gh release edit <version> --notes-file <file>`.
4. For alphas, mark the release as prerelease
   (`gh release edit <version> --prerelease`) **while it is still a draft**.
   Do this before the publish gate and never after, so that stable clients
   never see the alpha.
5. If the release is a draft: **GATE — ask before publishing**
   (`gh release edit <version> --draft=false`). Publishing exposes the update
   feed (`latest*.yml`) to every installed client. This is the point of no
   return for auto-update.

## Phase 6 — Wrap up

1. Report the release URL, the asset count, and the green jobs.
2. Clean up the release worktree
   (`git worktree remove ../Rocket.Chat.Electron-worktrees/release-<version>`).
3. **Stable only**: check that `dev`'s `package.json` still equals TARGET
   (the version invariant). It should, because the bump happened on `dev`
   before the promotion.
4. **Patch only**: you may have written the fix directly on the release
   branch (not cherry-picked from `dev`). If so, remind the user to
   forward-port it to `dev` with a small cherry-pick PR. This is the one exception to the
   never-back-merge rule.
5. Optional (ask): transition linked Jira tickets to Done (desktop tickets:
   assignee Jean, component Electron) and comment the release URL on shipped
   PRs.

## Failure modes

| Symptom                                                                                                                                                   | Likely cause                                                                                                                                                                           | Action                                                                                                                                                                              |
| --------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Tag run missing from `gh run list`                                                                                                                        | Tag pushed before merge, or push rejected                                                                                                                                              | Check that the tag exists on the remote and points at the HEAD of the right branch                                                                                                  |
| `windows-msi` or another Windows job fails at signing/MSI                                                                                                 | KMS CNG provider conflict (two-phase signing)                                                                                                                                          | Read `--log-failed`. Usually re-run the job, no code change                                                                                                                         |
| macOS job stuck >1h at notarize                                                                                                                           | Apple notarization queue                                                                                                                                                               | Wait. Escalate after a 2h stall                                                                                                                                                     |
| Release exists but assets partial                                                                                                                         | One platform job failed after others published                                                                                                                                         | Fix or re-run the failed job. electron-builder appends to the same release                                                                                                          |
| `latest*.yml` version ≠ tag                                                                                                                               | `package.json` bump missed before tag                                                                                                                                                  | Critical: the auto-updater breaks. Delete release+tag and redo from Phase 2                                                                                                         |
| macOS job fails at `security set-key-partition-list` with `SecKeychainUnlock: The user name or passphrase you entered is not correct`, before any signing | electron-builder < 26.16.1 passes the p12 password where the temp keychain's own password is expected. Newer macOS runner images reject it (first seen Sep 2026, provisioner 20260828) | Not a flake: a rerun fails identically. The fix is code: a yarn patch on `app-builder-lib` (in `.yarn/patches/`, see 4.17.1) or a bump to electron-builder ≥ 26.16.1. Then Phase 4b |
| Tag run needs a code fix and the release is still a draft                                                                                                 | CI/toolchain regression or bump mistake that the tag run exposed                                                                                                                       | Phase 4b: land the fix, delete draft + tag, and re-tag the same version. Never for a published release                                                                              |
| `yarn release:tag` guard rejects HEAD                                                                                                                     | Tag from the wrong branch for the channel (for example a stable off `dev` directly, or an alpha off a `release/*` branch)                                                              | Check that you are on the right branch and commit. Use `--allow-unverified-ref` only with explicit user confirmation                                                                |
| Release PR (`dev`→`master`) squashed by accident                                                                                                          | Wrong merge method selected in the merge dialog or CLI                                                                                                                                 | Irreversible: history has forked. Escalate to the user immediately. Do not try to "fix" it by force-pushing `master`                                                                |
