---
name: ship-release
description: Ship a Rocket.Chat.Electron release end-to-end. Collects merged fixes since the last tag, drafts release notes, bumps the version on a chore/release branch, opens the bump PR, and — after explicit user approval at each gate — merges, tags, monitors the build-release pipeline in the background, verifies the published release has the full platform asset matrix, and syncs the Jira release (fixVersion on every shipped issue, creating issues for work that has none). Handles stable, patch, and alpha releases plus alpha→stable promotion. Trigger when the user says "ship release X.Y.Z", "release 4.16.0", "cut a patch release", "promote alpha to stable", "/ship-release", or asks to sync/backfill a Jira release's fixVersions.
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
- **Always tag with `yarn release:tag`** (`scripts/release-tag.ts`) — never hand-rolled `git tag` + `git push`. Its channel-aware guards (tag-exists, semver-greater-within-channel) are the safety net; a manual tag skips them. If it refuses, fix the cause — do not work around it.
- Bump PRs squash-merge (history convention: `chore: bump version to X.Y.Z (#NNNN)`).
- All three platform jobs (ubuntu / macos / windows) must be green before the release counts as buildable. No partial releases.
- A release without the full asset matrix (below) is NOT done — report exactly which assets are missing.
- Monitor CI in the background (`run_in_background` Bash or `watcher`) — never block the session polling in foreground.

## Phase 0 — Resolve version & scope

1. Fresh state: `git fetch origin master --tags`.
2. Latest tags, semver-sorted (not by creation date — an alpha or an older version created later can otherwise look newest): `git tag --sort=-v:refname | head -5`. Current version: `node -p "require('./package.json').version"`.
3. Resolve TARGET from the arg, or propose: patch bump over the latest **stable** tag (`scripts/release-tag.ts`'s channel logic — exclude alpha/beta/rc tags when picking the stable baseline). If latest tag is an alpha of the same version, this is a **promotion** (drop the `-alpha.N` suffix).
4. Collect what ships: `git log <last-tag>..origin/master --oneline --no-merges`. Filter out chore/version-bump commits.
5. If master has nothing new since the last tag → STOP and tell the user there is nothing to release.

## Phase 1 — Release notes draft

1. Map each shipped commit to its PR (`(#NNNN)` suffix) and pull titles: `gh pr view NNNN --json title,labels`.
2. Draft notes grouped as: 🐛 Fixes / ✨ Improvements / 🔧 Internal. Straightforward language, what changed and why — no invented metrics.
3. **Customer-facing framing rule applies**: partial-scope fixes are "hardening" / "did not cover path X", never "was broken" / "regression".
4. Show the draft to the user. Notes get applied to the GitHub release in Phase 5.

## Phase 2 — Bump branch & PR

1. Create the release worktree and record its path — every command below runs inside it (`cd` into it, or `git -C <path>`), never in the user's own checkout:
   ```sh
   git worktree add ../Rocket.Chat.Electron-worktrees/release-<version> -b chore/release-<version> origin/master
   RELEASE_WT=$(pwd)/../Rocket.Chat.Electron-worktrees/release-<version>
   cd "$RELEASE_WT"
   ```
2. Bump `"version"` in `package.json` (root, ~line 9). Nothing else — no lockfile change needed for a version bump.
3. **GATE: show the diff and STOP for explicit user approval before the first commit + push of `chore/release-<version>`.**
4. Commit: `chore: bump version to <version>` and push the branch (still inside `$RELEASE_WT`).
5. Open PR to **master** titled `chore: bump version to <version>`, body = the shipped-changes list from Phase 1. No `build-artifacts` label (release build comes from the tag, not the PR).
6. Wait for `validate-pr` checks (lint + tests on all 3 platforms).
7. **GATE: show PR URL + checks status. STOP until the user says merge.**

## Phase 3 — Merge & tag

All commands in this phase run inside `$RELEASE_WT` (`git -C "$RELEASE_WT" ...` or stay `cd`'d in) — never in the user's own checkout.

1. Squash-merge: `gh pr merge <PR> --squash`.
2. `git -C "$RELEASE_WT" fetch origin master` and confirm the merge commit is HEAD of `origin/master` and its `package.json` has TARGET.
3. **GATE: confirm with the user before pushing the tag** (tag push = build + release creation; deleting a tag after builds start is messy).
4. Move the release worktree HEAD onto the master merge commit, then tag with **`yarn release:tag`** — always the repo script, never hand-rolled `git tag`/`git push`. The worktree is still on `chore/release-<version>` (the pre-merge bump commit); tagging there ships the wrong tree, so detach onto the squashed merge commit first:

   ```sh
   MERGE_SHA=$(git -C "$RELEASE_WT" rev-parse origin/master)
   git -C "$RELEASE_WT" checkout "$MERGE_SHA"              # detached HEAD at the merge commit
   node -p "require('$RELEASE_WT/package.json').version"   # MUST print TARGET
   cd "$RELEASE_WT" && yarn install                        # required — see below
   yarn release:tag --yes
   ```

   `scripts/release-tag.ts` reads the version from `package.json`, fetches `origin/master` and tags, then **fails closed (exit 1)** on:

   | Guard                                                  | Override                       |
   | ------------------------------------------------------ | ------------------------------ |
   | Invalid semver in `package.json`                       | none                           |
   | HEAD not contained in `origin/master`                  | `--allow-detached-from-master` |
   | Tag already exists                                     | none — not even `--force`      |
   | Version not greater than latest tag **in its channel** | `--force`                      |

   Channel detection (stable / alpha / beta / candidate) compares only within a channel, so an alpha never blocks a stable or vice versa. The origin/master guard is what makes step 4's "detach onto the merge commit" enforced rather than merely documented — a hand-rolled `git tag` skips every one of these.

   - **`--yes` skips the confirmation prompt** (also auto-skipped when `CI=true`), so an agent can run this unattended. Step 3 is already the human gate. Without the flag it prompts `Proceed? (y/N)` over `readline`, which needs a real TTY — piping `echo y` is unreliable.
   - **`yarn install` first.** A fresh worktree has no `node_modules`, and without it the script dies with `Couldn't find the node_modules state file (findPackageLocation)`. Install — do not work around it by tagging by hand.
   - **If the script refuses, that is a real finding** — report the guard that fired and fix the cause. Do not bypass it with manual git commands, and do not reach for `--force`/`--allow-detached-from-master` without the user explicitly agreeing.
   - After it reports success, verify the tag landed on the right commit:
     ```sh
     git -C "$RELEASE_WT" fetch origin --tags
     test "$(git -C "$RELEASE_WT" rev-list -1 <version>)" = "$MERGE_SHA" \
       && echo "tag OK" || echo "TAG POINTS AT THE WRONG COMMIT — do not proceed"
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

   | Platform | Expected assets                                                                                            |
   | -------- | ---------------------------------------------------------------------------------------------------------- |
   | macOS    | `-mac.dmg` (+`.blockmap`), `-mac.pkg`, `-mac.zip`, `-mas.pkg`, `latest-mac.yml`                            |
   | Windows  | x64/ia32/arm64 × (`.exe` +`.blockmap`, `.msi`, `.appx`), universal `-win.exe` (+`.blockmap`), `latest.yml` |
   | Linux    | `.deb`, `.rpm`, `.snap`, `.AppImage`, `.tar.gz`, `latest-linux.yml`                                        |

   (4.15.1 reference: 27 assets total.)

3. Apply the Phase 1 release notes: `gh release edit <version> --notes-file <file>`.
4. Alphas: mark prerelease (`gh release edit <version> --prerelease`) **while still a draft** — do this before the publish gate, never after, so the alpha is never briefly visible to stable clients.
5. If the release is a draft: **GATE — ask before publishing** (`gh release edit <version> --draft=false`). Publishing exposes the update feed (`latest*.yml`) to every installed client — this is the point of no return for auto-update.

## Phase 6 — Jira release sync

Every shipped PR must be traceable to a Jira issue carrying `fixVersion = [Electron] <version>`, so the release report answers "what went into this version". Do this **after** the GitHub release is verified, using the Phase 1 PR list as the work inventory.

### Credentials

The Atlassian MCP tools (`createJiraIssue`, `editJiraIssue`, `searchJiraIssuesUsingJql`) handle most of it. For raw REST — transitions, version metadata — use the `jira` CLI's stored token; it has no `api` subcommand, so call REST directly:

```sh
TOKEN=$(security find-generic-password -s "jira-cli" -w)
LOGIN=$(grep -i "^login:" ~/.config/.jira/.config.yml | awk '{print $2}')
curl -s -u "$LOGIN:$TOKEN" -H "Accept: application/json" <url>
```

Route curl through `ctx_execute` — a PreToolUse hook redirects curl/wget out of plain Bash.

### Steps

1. **Resolve the version.** Name format is `[Electron] X.Y.Z` — NOT bare `X.Y.Z`, and JQL on the wrong name silently returns zero issues rather than erroring. Confirm before trusting an empty result:

   ```sh
   curl -s -u "$LOGIN:$TOKEN" "https://rocketchat.atlassian.net/rest/api/3/project/CORE/version?maxResults=100&query=Electron"
   ```

   Releases are usually pre-created by the team. If absent, ask — creating one needs project-admin rights (see step 6).

2. **Inventory.** For each PR in the Phase 1 list, find its Jira issue: a `CORE-NNNN` in the PR title/body/branch, or search by feature keywords (`searchJiraIssuesUsingJql`, component `Electron`). Broad JQL sweeps blow the MCP token limit — restrict `fields` to `summary,status,issuetype,fixVersions` and parse the saved file with `ctx_execute` when it still overflows.

3. **Existing issues** — add the fixVersion, leaving other fields alone:

   ```
   editJiraIssue(issueIdOrKey: "CORE-NNNN", fields: {"fixVersions": [{"name": "[Electron] <version>"}]})
   ```

   This REPLACES the array — preserve prior entries if an issue shipped in several versions.

4. **Uncovered work** — create an issue per feature area (not per PR; related PRs group into one). Ask the user for granularity if the split isn't obvious. Set `components: [{"name": "Electron"}]` and the fixVersion at creation:

   ```
   createJiraIssue(projectKey: "CORE", issueTypeName: "Task"|"Bug",
     additional_fields: {"components": [{"name":"Electron"}],
                         "fixVersions": [{"name": "[Electron] <version>"}]})
   ```

   Each description: what shipped, why, PR links, and any QA/verification note. Include chores, deps, docs, i18n and CI — the release report is the audit trail, and "no user-visible change" is itself worth recording. Don't invent metrics; quote only numbers the PR actually reports.

5. **Transition to Done.** Transition id **111** → Done on the CORE workflow; resolution is set automatically and is NOT a settable field on it — `jira issue move <key> Done --resolution Done` fails with a bare `400`. Confirm ids first (workflows change):

   ```sh
   curl -s -u "$LOGIN:$TOKEN" "https://rocketchat.atlassian.net/rest/api/3/issue/<key>/transitions?expand=transitions.fields"
   curl -s -u "$LOGIN:$TOKEN" -X POST -H "Content-Type: application/json" \
     -d '{"transition":{"id":"111"}}' \
     "https://rocketchat.atlassian.net/rest/api/3/issue/<key>/transitions"   # expect HTTP 204
   ```

   Ask before flipping issues that QA still holds (`in QA`, `Ready for QA`) — that status is QA's tracking, not yours.

6. **Mark the version released** — needs **global or project-admin rights**, which the desktop maintainer account does NOT have. The PUT returns an empty body and silently no-ops (a fuller payload surfaces the real _"You must have global or project administrator rights in order to modify versions"_). Never report this as done off the response — GET the version back and check `released`. When it fails, hand it to a CORE project admin and say so explicitly.

7. **Verify and report** — never trust the write responses alone:
   ```sh
   curl -s -u "$LOGIN:$TOKEN" -G \
     --data-urlencode 'jql=project=CORE AND fixVersion=<versionId> ORDER BY key ASC' \
     --data-urlencode 'fields=summary,status,resolution,issuetype' \
     "https://rocketchat.atlassian.net/rest/api/3/search/jql"
   ```
   Cross-check every Phase 1 PR against the issue set and report leftovers. Auditing by scraping `/pull/` links out of descriptions gives false positives — older tickets describe fixes in prose without links, so map those by hand before claiming a gap.

Keeping this current per-release is far cheaper than reconstructing it from `git log` months later.

## Phase 7 — Wrap up

1. Report: release URL, asset count, platforms green, Jira release URL + issue count.
2. Cleanup: remove the release worktree (`git worktree remove ../Rocket.Chat.Electron-worktrees/release-<version>`).
3. Optional (ask): comment the release URL on shipped PRs.

## Failure modes

| Symptom                                                  | Likely cause                                              | Action                                                                                          |
| -------------------------------------------------------- | --------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| Tag run missing from `gh run list`                       | Tag pushed before merge, or push rejected                 | Verify tag exists on remote and points at master HEAD                                           |
| Windows job fails at signing/MSI                         | KMS CNG provider conflict (two-phase signing)             | Read `--log-failed`; usually re-run, not code                                                   |
| macOS job stuck >1h at notarize                          | Apple notarization queue                                  | Wait; stall threshold 2h before escalating                                                      |
| Release exists but assets partial                        | One platform job failed after others published            | Fix/re-run failed job; electron-builder appends to same release                                 |
| `latest*.yml` version ≠ tag                              | package.json bump missed before tag                       | Critical — auto-updater breaks; delete release+tag, redo from Phase 2                           |
| Jira release reads empty                                 | JQL used bare `X.Y.Z`; real name is `[Electron] X.Y.Z`    | Resolve the name/id from the project version list — a wrong name returns zero, not an error     |
| `jira issue move ... Done` → `400`                       | `--resolution` is not settable on transition 111          | Drop the flag; POST the transition, resolution is set by the workflow                           |
| Version stays unreleased after PUT                       | Account lacks project-admin rights (empty-body no-op)     | GET the version to confirm; hand the toggle to a CORE project admin                             |
| `release:tag` → `findPackageLocation`                    | Fresh worktree has no `node_modules`                      | `yarn install` in the worktree — never tag by hand instead                                      |
| `release:tag` hangs at `Proceed? (y/N)`                  | Ran without `--yes`; `readline` needs a TTY               | Re-run with `--yes` (step 3 is already the human gate)                                          |
| `release:tag` → "HEAD is not contained in origin/master" | Tagging the pre-merge bump commit, not the squashed merge | Detach onto `origin/master` (Phase 3 step 4) — this guard is the point, do not override blindly |
| `release:tag` refuses the version                        | Guard fired: tag exists, or not greater in-channel        | Real finding — report the guard; fix the version, do not bypass with manual git                 |
