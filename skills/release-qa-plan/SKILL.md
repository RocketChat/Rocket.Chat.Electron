---
name: release-qa-plan
description: Builds the stable-release QA plan for Rocket.Chat Desktop. Collects every change between the last stable tag and dev and maps each user-facing or packaging change to a QA flow. Writes a Qase-ready `qa/release-X.Y.Z/` pack for the installed prerelease build on each platform and package type. Gives a go/no-go report from the results. Use before a stable promotion. Triggered by "/release-qa-plan", "QA plan for the stable release", "what must we test before X.Y.0", "release regression plan", "can this alpha go stable".
---

# Release QA Plan

Makes the QA plan that gates a stable promotion (`ship-release`, stable).
The plan tests the **installed build** of a prerelease tag, not `yarn start`.
The output is a QA pack, `qa/release-<X.Y.Z>/`, in the format of
`qa/README.md`. It has one more rule: every change in the range has a flow
or a written reason.

## Hard rules

- The build under test must contain every change that needs QA. The
  collector `--check` fails when it does not. Then cut a new prerelease
  (`ship-release`, alpha) and update the pack. Do not test an older build
  and call the range covered.
- Every `user-facing` and `packaging` change in the range must appear in
  the pack by PR number (`#NNNN`). Put it in a flow's `## Review Basis`, or
  in the README coverage table with the reason that it needs no flow. The
  collector `--check` enforces this.
- Get each tester-facing step from the code (`qa/AGENTS.md`). A step that
  runs on the **old stable build** (the upgrade flows) comes from the old
  tag's code: `git show <base>:<path>`. The UI can be different between
  the two versions.
- QA-only work: do not change app behavior. Write the pack on a
  `chore/qa-release-<version>` branch from fresh `origin/dev`, in a
  worktree. Commit, push, and open the PR only when the user says so.
- The pack is public. Do not write customer names, internal links, or
  ticket text. You can write a bare ticket key.
- Write the pack in STE (`asd-ste100`): strict mode for flow steps,
  STE-flavored for the README.

## The collector

`skills/release-qa-plan/collect-changes.mjs` (Node built-ins, read-only git,
and one `gh api graphql` query for the PR data):

```sh
git fetch origin --tags
node skills/release-qa-plan/collect-changes.mjs                    # table + PR digests
node skills/release-qa-plan/collect-changes.mjs --format json      # full data, full PR bodies
node skills/release-qa-plan/collect-changes.mjs --check qa/release-4.18.0
```

The unit of work is the **PR**, not the commit. The squash commit tells you
which files changed. The PR tells you why, what the author tested, and
what they did not test. If `gh` fails, the collector stops. `--no-gh`
skips the PR data, but use it only offline, because the output is weaker.

Defaults: `--base` is the highest stable `X.Y.Z` tag. `--head` is
`origin/dev`. `--build` is the tag at head, or else the newest prerelease
tag that is an ancestor of head. For each squash commit in
`merge-base(base, head)..head` the collector gives:

- `pullRequest`: title, URL, author, labels, file count, the full body, and
  a digest. The digest is the summary section plus the test,
  and known-limitations sections. The Markdown output prints the digests.

- `category`: `user-facing` (changes `src/`), `packaging` (builder config,
  dependencies, `build-release.yml`, release action), `no-runtime` (docs,
  CI, tests, agent tooling), or `version-bump`.
- `areas` (`src/<module>`) and `platforms`: hints from file paths and
  added lines, for example `process.platform === 'darwin'`, `process.mas`,
  `windowsStore`, `SNAP`.
- `shippedInStable`: the change is also on the stable line (a cherry-pick).
  `pr-reference` is the strongest match: a stable-line PR names this PR,
  for example "Cherry-pick of #3535". Then come `patch-id` and `subject`.
  `similar-subject` means "maybe". Read both PRs before you trust it.
  A shipped change still needs a regression check in the new build, but at a
  lower priority.

## Phase 0 — Lock the range

1. Run the collector. Record the base, head, merge base, and build under
   test.
2. If the build line shows `MISSING`, stop. Tell the user which PRs are not
   in the build, and that a new prerelease is necessary before QA starts.
3. Run `gh release view <build> --json assets --jq '.assets[].name'`. Make
   the install matrix from the result: each installer and package type
   (`dmg`, `pkg`, `mas.pkg`, `exe` per architecture, `msi`, `appx`,
   `AppImage`, `deb`, `rpm`, `snap`, `tar.gz`). The Mac App Store build is
   tested through TestFlight.

## Phase 1 — Understand each change

For each PR that needs coverage, in collector order:

1. Read the full PR, not only the digest:
   `gh pr view <N> --json title,body,files,comments,reviews`. Read the
   review threads too: they often name an edge case or a platform that
   the body does not. Follow each PR that the body names (a follow-up, a
   revert, a stacked parent).
2. Read the diff (`gh pr diff <N>`) for the user-visible parts: components,
   i18n strings, menu items, settings, platform guards. The PR body gives
   the intent. The diff is the truth. If they do not agree, use the diff
   and write the difference in the coverage table.
3. Use the PR's own test notes. A manual check that the author did on one
   platform is a flow step for the other platforms. Each item that the PR
   did not test, or puts under "Known limitations", needs a flow step. If
   it gets no step, write in the coverage table why it stays open.
4. Name the user-visible surface and the platforms. Use the risk classes in
   `skills/desktop-qa-flows/SKILL.md`, step 3. Write down who can reach the
   change: a setting, Developer Mode, a platform, or a package type. For
   example, the MAS build has no in-app call window. For a gated feature,
   add a flow that proves that a user who never opens the gate sees no
   change.
5. Write one falsifiable hypothesis: user action, expected behavior,
   failure mode, platform.
6. Search `qa/*/flows/*.md` for a flow that already proves the hypothesis.
   If one exists, reference it by ID. Do not copy it. Add its ID to the
   README `## Reused flows` section, so that the checklist runs it (Phase 2).
7. Group the PRs by surface. Write one flow for each user-visible
   hypothesis, not one for each PR. One flow can cover many PRs.
8. A change can have no user-visible effect, for example dead-code removal.
   For such a change, write the reason in the coverage table. Name the smoke
   flow that would show a regression.
9. A fix in the update path (download, restart, install) runs in the
   **old** version, the one that updates. To test it, start from the
   earlier prerelease that already has the fix, and update to the build
   under test. An update from the last stable runs the old code, and can
   still show the old bug.

## Phase 2 — Write the pack

Make `qa/release-<X.Y.Z>/` as the `qa/README.md` pack structure says.
Use the flow IDs `REL<major><minor>-QA-NNN`, for example `REL418-QA-001`.

Flow rules that the tools enforce, or that broke flows in the 4.18.0 run:

- Write the build tag only in the README. A flow says "the build under
  test", so a new prerelease does not make it stale.
- `priority`: `smoke` is for the baseline flows. `release` is for behavior
  that every user on a platform can hit. `high` is for a new feature or
  fix. `medium` is for a narrow or tester-only path. The checklist runs them in
  this order.
- Do not put `|` in a table cell, not even as `\|`. `validate-flows.mjs`
  splits the cell there.
- Do not write "Open Settings" alone. Give the path: "Press Command+,
  (macOS) or Ctrl+, (Windows, Linux)". The keyboard shortcut is the same on
  all platforms and in all versions since 4.17.
- `requires` tokens are free text. List each token that the pack uses in
  the README prerequisites, with what the tester must prepare.
- Some test data can expire, for example a PR number with a preview build
  or a meeting alias. Put it in a README `## Test data` table, with the
  date that you checked it.

A flow that depends on the package type lists the packages in its
frontmatter, in `packages:`. The names are `dmg`, `pkg`, `mas`, `exe`, `msi`,
`appx`, `appimage`, `deb`, `rpm`, `snap`, and `targz`. Keep `platforms:`
too, because `validate-flows.mjs` requires it.
The checklist (Phase 4) makes one item for each package of such a flow, and
one item for each platform of every other flow. Give each flow the
smallest scope that can fail alone: one flow is one item to mark done.

`README.md` must contain:

- The exact line `Build under test: <tag>`. The collector checks it.
- The range (`<base>..<head>` at the short SHA) and a coverage statement.
- The install matrix: package × OS × the flows to run on it.
- The smoke order.
- `## Reused flows`: one line per flow from another pack, `- CONF-QA-001`
  or `- CONF-QA-001 priority: release`. The checklist makes items for them.
- `## Prerequisites` and `## Test data` (see the flow rules above).
- The coverage table: `PR | Change | Surface | Platforms | Covered by`.
  Every `user-facing` and `packaging` row from the collector appears here,
  with flow IDs or the reason that no flow is necessary.
- The go/no-go criteria (Phase 5) and the result format from `qa/README.md`.

Baseline flows (`flows/0N-*`). Write them for each release, from the code
of this release:

1. **Fresh install, per package.** The app installs and starts. The
   bottom of the App settings sidebar (Command+, or Ctrl+,) shows the version
   of the build under test. Windows and Linux have no About item. To check the
   signature on macOS, run `codesign -dv --verbose=2` and `spctl -a -vv` on
   the `.app`. On Windows, use the installer **Properties › Digital
   Signatures** tab.
2. **Upgrade over the last stable.** Install `<base>`, add two workspaces,
   sign in, and change some settings. Then install the build under test
   over it. Do this with the installer, and, for `dmg`/`exe`/`AppImage`,
   through the in-app updater on the prerelease channel. Get the channel
   steps from the code of `<base>`. On `dev` the selector is under
   **Settings › Advanced › Update channel** and shows only in Developer mode.
   The workspaces, sign-in, and settings stay the same after the update.
3. **Core smoke.** Add a workspace, sign in, and send a message. Get a
   notification and click it. Open a deep link and use the tray or menu bar.
   Start a video call, share the screen, and download a file. Then quit and
   reopen the app, and make sure that the state stays.
4. **Store builds** (MAS, `appx`, `snap`). The electron-updater is off, and
   **Check for updates** acts as the store build code says
   (`src/updates/storeUpdates.ts`).

Then add the change flows from Phase 1.

## Phase 3 — Check the pack

```sh
node skills/release-qa-plan/collect-changes.mjs --check qa/release-<X.Y.Z>
node qa/scripts/validate-flows.mjs qa/release-<X.Y.Z>
node qa/scripts/export-qase-csv.mjs qa/release-<X.Y.Z>
~/.claude/skills/asd-ste100/scripts/ste-lint.py qa/release-<X.Y.Z>/README.md
for f in qa/release-<X.Y.Z>/flows/*.md; do
  awk 'NR==1&&/^---$/{fm=1;next} fm&&/^---$/{fm=0;next} !fm' "$f" > /tmp/flow-body.md
  ~/.claude/skills/asd-ste100/scripts/ste-lint.py /tmp/flow-body.md
done
git diff --check
```

All of them must pass. Lint the flow bodies without the frontmatter: the
linter reads the YAML block as one long sentence. A hard finding can stay
only when it quotes the product: a UI string, a log line, an OS feature
name. Then say so in the report. When a new prerelease is cut, run the collector
again. `--check` fails until you add the new PRs and the new build tag.
Then run `checklist.mjs sync` (Phase 4).

## Phase 4 — Run the plan (when the user asks)

The run is a checklist, so that a stop (a blocker, the end of the day, a
lost session) loses nothing. The state is in
`qa/release-<X.Y.Z>/results/checklist.md`, and only
`skills/release-qa-plan/checklist.mjs` changes it:

```sh
C=skills/release-qa-plan/checklist.mjs
node $C init   qa/release-<X.Y.Z>          # once, after Phase 3 passes
node $C status qa/release-<X.Y.Z>          # where the run is
node $C next   qa/release-<X.Y.Z> --target macos
node $C mark   qa/release-<X.Y.Z> REL418-QA-001 dmg wip
node $C mark   qa/release-<X.Y.Z> REL418-QA-001 dmg pass
node $C mark   qa/release-<X.Y.Z> REL418-QA-001 mas fail --note "<what, evidence path>"
node $C sync   qa/release-<X.Y.Z>          # after the flows or the build change
```

Rules for the loop:

- Before you start a flow, mark it `wip`. When it ends, mark it `pass`,
  `fail`, or `blocked` at once. Do not keep results in memory.
- `fail` and `blocked` need `--note`, with what happened and the evidence
  path.
- To continue after a stop, run `status`, then `next`. `next` gives a `wip`
  item first: run that flow again from step 1. Then it gives the open items
  in priority order (smoke first).
- A result from another build is stale. `next` gives it again. When the
  README gets a new `Build under test`, run `sync`. The old results stay,
  but they count only after a rerun.
- One tester for each platform can run `next --target <platform>` at the
  same time, each with their own checklist file. Put the results together
  before Phase 5.

The steps on each machine:

1. Download the assets for this machine:
   `gh release download <build> -p '<pattern>' -D <new empty dir>`.
2. Do the checks that you can do from a shell yourself: installed version
   (`defaults read /Applications/Rocket.Chat.app/Contents/Info.plist
CFBundleShortVersionString`), signature, and logs. The macOS log is
   `~/Library/Logs/Rocket.Chat/main.log` for the `dmg` and `pkg` builds, and
   `~/Library/Containers/chat.rocket/Data/Library/Logs/Rocket.Chat/main.log`
   for MAS and TestFlight. On Windows and Linux, use **Help › Open Log
   Viewer**, which works on all platforms.
3. UI steps need a tester or a visual agent. The port-9339 inspector
   (`dev-app-verify`) is for `yarn start` only, not for an installed build.
   Do not use a software-rendered VM for screen capture (`AGENTS.md`,
   Testing).
4. Keep the evidence files in `qa/release-<X.Y.Z>/results/`, next to the
   checklist. Write the evidence path in the `--note`. Do not commit the
   results, and do not delete the worktree until you finish Phase 5.

## Phase 5 — Go/no-go report

Run `checklist.mjs status`. Do not write the report while it shows
`todo`, `wip`, or `stale` items, unless the user tells you to stop the run.
Start with a short statement: go or no-go, and why. Then give:

- The `status` table, and each item that is not `pass`.
- Each `confirmed` failure, with its evidence. Each `suspected` and
  `blocked` item, with its cause.
- The criteria for **go**: all smoke flows pass on macOS, Windows, and
  Linux. No `release`-priority flow has a confirmed failure. The user
  accepts each blocked item by name.
- A numbered list of what the user must do next.

A go does not authorize the promotion. The stable promotion is
`ship-release`, with its own approval gates.
