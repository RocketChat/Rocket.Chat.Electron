# Release Process

This document describes how Rocket.Chat Desktop moves code from a merged PR
to a published release, for every channel: alpha, stable, and patch. It
replaces the former `docs/alpha-release-process.md` and
`docs/pre-release-process.md`.

For the conceptual overview, see `development-and-release-flow.md`.

## Branch model

| Event                 | Where                           | Mechanics                                                                                                                                                |
| --------------------- | ------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Feature/fix PR        | → `dev` (default branch)        | squash-merge                                                                                                                                             |
| Alpha `X.Y.0-alpha.N` | on `dev`                        | bump PR on `dev` → tag the `dev` tip via `yarn release:tag`                                                                                              |
| Stable `X.Y.0`        | `dev` → `master`                | bump PR on `dev` first, then a release PR `dev`→`master` merged with a **true merge commit** (`gh pr merge --merge`, never squash), tag the merge commit |
| Patch `X.Y.Z`         | `release/X.Y.x`                 | branch cut from the stable tag `X.Y.0`. Fixes land on `dev` first and are cherry-picked down. Bump and tag on the release branch                         |
| Back-merges           | **never** (one exception below) | bump-on-dev-first keeps `master` a pure superset of `dev`                                                                                                |

Do not use `release/<version>-alpha.N` (or any alpha) branch naming.
`release/` is reserved exclusively for patch lines (`release/4.16.x`, etc.).
Alpha work stays on `dev` and has no long-lived branch of its own.

## How channels work

| Channel | Version Format   | Who Receives It     |
| ------- | ---------------- | ------------------- |
| Stable  | `4.12.0`         | All users (default) |
| Beta    | `4.12.0-beta.1`  | Beta opt-in users   |
| Alpha   | `4.12.0-alpha.1` | Alpha opt-in users  |

Every release (stable, beta, or alpha) uploads the same update metadata
(`latest.yml`, `latest-mac.yml`, `latest-linux.yml`). There is no
per-channel `.yml` filename. Two things separate the channels:

- Whether the GitHub release is marked **Pre-release** (true for alpha/beta,
  false for stable).
- Whether the client has opted into prereleases. electron-updater's
  `allowPrerelease` is enabled for the alpha/beta channel settings and
  disabled for stable.

The updater of a stable client ignores prerelease-flagged releases, even
though they share the same `latest*.yml` file names.

**Channel hierarchy**: Alpha users receive alpha, beta, AND stable updates.
Beta users receive beta AND stable. Stable users receive only stable.

## The dev version invariant

`package.json`'s `"version"` on `dev` always equals the newest tag cut from
`dev`'s line:

- Right after the promotion of `4.16.0` to `master`, `dev` stays at `4.16.0`.
  The bump PR changed it to `4.16.0` before the promotion PR.
- The first alpha of the next cycle bumps `dev` straight to
  `4.17.0-alpha.1`. Start numbering at `.1` and never use a phantom `.0`.
  There is no bare `4.17.0` tag until that cycle stabilizes.

## Tagging with `yarn release:tag`

Create every release tag with `yarn release:tag`. NEVER use a hand-rolled
`git tag` and `git push`. The script (`scripts/release-tag.ts`) does these
things:

1. It reads the version from `package.json`.
2. It fetches the refs that the version's channel allows.
3. It fails closed (exit 1) on every unsafe case.
4. It tags HEAD as the bare version and pushes the tag.

A tag that you create by hand skips all of these steps.

### Channels and allowed refs

The script detects the channel (stable, alpha, beta, or candidate) from the
version. It compares a version only with the tags of its own channel. An
alpha never blocks a stable, and a stable never blocks an alpha.

The allowed remote refs depend on the channel:

- A prerelease tag (alpha, beta, or rc: any version with a prerelease id)
  needs HEAD to be an ancestor of `origin/dev` or of any `origin/release/*`
  branch.
- A stable tag (no prerelease id) needs HEAD to be an ancestor of
  `origin/master` or of any `origin/release/*` branch.

The script finds the `origin/release/*` branches at run time with
`git ls-remote --heads origin 'release/*'`.

### Guards

| Guard                                                  | Override                  |
| ------------------------------------------------------ | ------------------------- |
| Invalid semver in `package.json`                       | none                      |
| HEAD not an ancestor of an allowed ref for its channel | `--allow-unverified-ref`  |
| Tag already exists                                     | none — not even `--force` |
| Version not greater than latest tag **in its channel** | `--force`                 |

If a guard fires, treat it as a real finding. Report it and fix the cause.
Use `--force` or `--allow-unverified-ref` only when the release owner agrees
explicitly.

### Flags

- `--yes` / `-y` skips the confirmation prompt. The script also skips the
  prompt automatically when `CI=true`.
- `--help` lists all flags.
- Without `--yes`, the prompt reads a real TTY. Piping `echo y` is
  unreliable, so use the flag.

### Which commit to tag

Tag the **squashed merge or bump commit** on the branch that the channel
expects:

- Prereleases: `dev`.
- Stables: `master`, or a `release/X.Y.x` branch for a patch release.

NEVER tag a pre-merge bump commit on an unmerged branch. That ships the
wrong tree. The ref-ancestor guard enforces this rule. If the guard fires,
fix the checkout and do not override the guard.

### Tag names

The tag name is the bare version (`4.16.0`, no `v` prefix).
`build-release.yml` triggers on any tag push. The auto-updater feed derives
from the `package.json` version, which MUST match the tag.

### Fresh worktree

A fresh worktree has no `node_modules`. The script then fails with
`Couldn't find the node_modules state file (findPackageLocation)`. Run
`yarn install` in the worktree. NEVER work around the error by tagging by
hand.

### Where the logic lives

The pure tag and channel logic is in `scripts/releaseTag.lib.ts`. The unit
tests are in `scripts/releaseTag.lib.spec.ts`. `release-tag.ts` keeps the
I/O. Script specs run under their own Jest project (`testEnvironment:
'node'`).

The `ship-release` skill drives the full end-to-end flow: notes, bump PR,
merge, tag, CI, asset matrix, and Jira release sync.

## Creating an alpha release (on `dev`)

Cut alphas directly from `dev`. There is no dedicated branch.

1. Update the version on `dev`:

   ```bash
   git checkout dev
   git pull origin dev
   git checkout -b chore/release-4.17.0-alpha.1
   ```

   Edit `package.json`:

   ```json
   {
     "version": "4.17.0-alpha.1"
   }
   ```

   Also increment `mac.bundleVersion` in `electron-builder.json`. It is
   independent from `package.json`'s `version`. Apple requires each
   submission's `CFBundleVersion` to strictly increase over the last one.
   The format is `YYMM` plus a single-digit build counter. The counter
   resets to `0` at the start of each month. For example, the first build
   shipped in August 2026 is `26080`, and the second same-month build is
   `26081`. Check the current value and the date of its last bump
   (`git log -p --follow -- electron-builder.json`) before you increment it.
   NEVER guess an arbitrary increment.

2. Commit and open a PR to `dev`:

   ```bash
   git add package.json electron-builder.json
   git commit -m "chore: bump version to 4.17.0-alpha.1"
   git push origin chore/release-4.17.0-alpha.1
   ```

   Squash-merge the PR into `dev`.

3. Tag the `dev` tip:

   ```bash
   git checkout dev && git pull origin dev
   yarn release:tag
   ```

   The guard checks that the commit of an alpha tag is an ancestor of
   `origin/dev` or of a `release/*` branch. See "Tagging with `yarn release:tag`" for all guards.

4. CI builds automatically. A semver tag push is the only trigger for a
   publishable release build (`build-release.yml` does not run on branch
   pushes). A manual `workflow_dispatch` run is a dry run from a branch and
   does not publish a release.

   - A `prepare` job creates the **draft** GitHub release for the tag.
   - Then seven packaging jobs run in parallel and upload into the draft.
     The jobs are `windows-nsis`, `windows-msi`, `windows-appx`, `macos-dmg`
     (dmg + zip + pkg, universal, notarized), `macos-mas`, `linux-appimage`
     (AppImage + deb + rpm + tar.gz) and `linux-snap`. The `linux-snap` job
     also publishes to the Snapcraft channel for the version.
   - Exactly one job per platform uploads the electron-updater metadata:
     `latest.yml` from `windows-nsis`, `latest-mac.yml` from `macos-dmg`, and
     `latest-linux.yml` from `linux-appimage`. The metadata lists the files
     that the job built, so a second uploader would replace it with a
     partial list.
   - The draft is marked Pre-release for alpha, beta, and rc tags. That
     flag, and not the metadata file name, keeps the build away from stable
     clients.
   - Lint and the Jest suite do not run here. `yarn release:tag` accepts
     only a HEAD that is already on `dev`, `master` or a `release/*` branch.
     `validate-pr.yml` gates all of these branches.

   **Dry run without a tag.** `build-release.yml` also accepts
   `workflow_dispatch`, which is always a dry run. Run it from any branch
   (`gh workflow run build-release.yml --ref <branch>`). Every packaging job
   builds and signs its targets exactly as a tag push would. It skips GitHub
   releases and Snapcraft, and uploads its `dist/` as a `dry-run-<job>`
   workflow artifact. Use it to exercise a workflow or release-action change
   before you trust the change with a real tag.

5. Publish the release. Open the draft on GitHub Releases, review the notes,
   and click "Publish release". No client sees the release until a human
   publishes it.

## Promoting to a stable release (`dev` → `master`)

1. **Bump PR on `dev` first.** Drop the pre-release suffix in
   `package.json` (e.g. `4.17.0-alpha.6` → `4.17.0`). Open a PR that targets
   `dev` and squash-merge it. This keeps the version invariant intact. It
   also ensures that `master` never carries a version that `dev` has not
   already reached.
2. **Release PR `dev` → `master`.** Open a PR from `dev` into `master`.
   Merge it with `gh pr merge --merge`, a **true merge commit**. NEVER
   squash it. A squash of a release PR forks history permanently. `master`
   would stop being a subset of `dev`'s commit graph, and every future diff
   between the branches becomes unreadable.
3. **Tag the merge commit on `master`** with `yarn release:tag`. The
   channel-aware guard checks that a stable tag points at a commit that is
   an ancestor of `origin/master` or a `release/*` branch.
4. CI builds and drafts the release exactly as in the alpha flow. Publish
   after you check the assets.

## Patch releases (`release/X.Y.x`)

1. Make sure that the patch line branch exists. Cut it from the stable tag
   that it patches:

   ```bash
   git checkout -b release/4.16.x 4.16.0
   git push origin release/4.16.x
   ```

   If the branch already exists (an earlier patch), skip this step.

2. Write and merge the fixes on `dev` first. Then cherry-pick them onto the
   release branch:

   ```bash
   git checkout release/4.16.x
   git cherry-pick <fix-commit-sha>
   ```

3. The bump PR targets the release branch (`package.json` → `4.16.1`).
   Review and merge it there.
4. Tag on the release branch with `yarn release:tag`. The guard accepts a
   stable or patch tag whose commit is an ancestor of any `origin/release/*`
   branch, in addition to `origin/master`.
5. CI builds and drafts the release the same way. Publish after you check
   the assets.

## The never-back-merge rule

`master` never merges back into `dev`. A `release/X.Y.x` branch never merges
back into `dev` either. Two practices keep `master` a pure superset of
`dev`'s history, so that nothing on `master` needs to flow back:

- Bump `dev` before the promotion to `master`.
- Cherry-pick fixes down to patch lines from `dev`, and never the reverse.

**Single exception**: you may author a hotfix directly on a `release/X.Y.x`
branch, and not on `dev` with a cherry-pick down. You MUST forward-port such
a hotfix to `dev` immediately, with a small cherry-pick PR. Otherwise the
next promotion of `dev` to `master` silently loses the fix.

## How users opt into alpha/beta channels

### Option A: Via the App UI (recommended)

1. Open the **Help** menu and enable the **Developer Mode** checkbox.
2. Open **App settings** (`Ctrl+,`, or `Cmd+,` on macOS).
3. Go to the **Advanced** section. An **Update channel** dropdown appears
   when Developer Mode is on and updates are enabled for the build.
4. Select the desired channel:
   - **Stable** - Production releases only
   - **Beta** - Beta and stable releases
   - **Alpha (Experimental)** - Alpha, beta, and stable releases
5. Go to the **General** section and click **Check for updates now**.

The app persists the setting automatically. The setting survives app
restarts.

### Option B: Configuration file (for managed deployments)

Create `update.json` in the user data directory:

| Platform | Location                                                |
| -------- | ------------------------------------------------------- |
| Windows  | `%APPDATA%\Rocket.Chat\update.json`                     |
| macOS    | `~/Library/Application Support/Rocket.Chat/update.json` |
| Linux    | `~/.config/Rocket.Chat/update.json`                     |

Content for alpha channel:

```json
{
  "channel": "alpha"
}
```

Content for beta channel:

```json
{
  "channel": "beta"
}
```

For enterprise deployments where you want to force the setting (users
cannot change it):

```json
{
  "channel": "beta",
  "forced": true
}
```

## Switching channels

### Switching to a pre-release channel (stable → alpha/beta)

1. Enable **Developer Mode** in the **Help** menu.
2. Open **App settings** and go to the **Advanced** section.
3. Select the desired channel from the **Update channel** dropdown.
4. Click "Check for updates now" in the **General** section. The app offers
   the next pre-release version.

### Switching back to stable (alpha/beta → stable)

1. Open **App settings** and go to the **Advanced** section.
2. Select "Stable" from the **Update channel** dropdown.
3. Click "Check for updates now" in the **General** section.

**Important**: Switching to stable does NOT automatically downgrade the
app. This is what happens:

- You are on `4.12.0-alpha.2` and switch to the stable channel. You receive
  the next **stable** release (e.g., `4.12.0`). Semver considers `4.12.0`
  greater than `4.12.0-alpha.2`, so the app offers it as an update. You do
  not receive further alpha/beta releases until you switch back.
- To downgrade immediately, uninstall the current version. Then download
  and install the stable version from GitHub releases.

## Version numbering guidelines

- **Alpha**: `4.12.0-alpha.1`, `4.12.0-alpha.2`, etc.
- **Beta**: `4.12.0-beta.1`, `4.12.0-beta.2`, etc.
- **Stable**: `4.12.0`
- **Patch**: `4.12.1`, `4.12.2`, etc., on `release/4.12.x`.

Typical release progression:

```text
4.12.0-alpha.1 → 4.12.0-alpha.2 → 4.12.0-beta.1 → 4.12.0-beta.2 → 4.12.0 → 4.12.1
```

## Safety guarantees

- Stable users **never** see alpha/beta releases. Their updater ignores
  prerelease-flagged releases.
- Users must enable Developer Mode explicitly and select the alpha/beta
  channel.
- Alpha and beta releases are marked as "Pre-release" on GitHub.
- A semver tag push (never a branch push) creates a **draft** release, and a
  human reviews and publishes it explicitly. No client receives a release
  before that. A manual `workflow_dispatch` run is a dry run and publishes
  nothing.
- The app persists the channel selection, and it survives restarts.
- Users can switch channels at any time in App settings.

## Troubleshooting

### Update not showing after channel switch

1. Check that the release is published (not draft) on GitHub.
2. Check that `latest.yml`, `latest-mac.yml`, and `latest-linux.yml` exist
   in the release assets. Check that the Pre-release flag of the release
   matches the intended channel (checked for alpha/beta, unchecked for
   stable).
3. Click "Check for updates now" in the **General** section of App settings.
4. Restart the app and try again.

### Channel dropdown not visible

1. Make sure that **Developer Mode** is enabled in the **Help** menu.
2. Close and reopen App settings.
3. Restart the app completely.

### Checking current channel

With Developer Mode enabled, open App settings. The **Advanced** section
shows the current channel in the **Update channel** dropdown.

### Where settings are stored

The app stores the channel preference in its config file:

- **Windows**: `%APPDATA%\Rocket.Chat\config.json`
- **macOS**: `~/Library/Application Support/Rocket.Chat/config.json`
- **Linux**: `~/.config/Rocket.Chat/config.json`

Look for the `updateChannel` key (values: `latest`, `beta`, or `alpha`).
