# Release Process

This document describes how Rocket.Chat Desktop moves code from a merged PR
to a published release, for every channel: alpha, stable, and patch. It
replaces the former `docs/alpha-release-process.md` and
`docs/pre-release-process.md`.

For the conceptual overview, see `development-and-release-flow.md`.

## Branch model

| Event | Where | Mechanics |
|---|---|---|
| Feature/fix PR | → `dev` (default branch) | squash-merge |
| Alpha `X.Y.0-alpha.N` | on `dev` | bump PR on `dev` → tag the `dev` tip via `yarn release:tag` |
| Stable `X.Y.0` | `dev` → `master` | bump PR on `dev` first, then a release PR `dev`→`master` merged with a **true merge commit** (`gh pr merge --merge`, never squash), tag the merge commit |
| Patch `X.Y.Z` | `release/X.Y.x` | branch cut from the stable tag `X.Y.0`; fixes land on `dev` first and are cherry-picked down; bump + tag on the release branch |
| Back-merges | **never** (one exception below) | bump-on-dev-first keeps `master` a pure superset of `dev` |

Do not use `release/<version>-alpha.N` (or any alpha) branch naming —
`release/` is reserved exclusively for patch lines (`release/4.16.x`, etc.).
Alpha work stays on `dev`; it never gets its own long-lived branch.

## How channels work

| Channel | Version Format | Who Gets It |
|---------|---------------|-------------|
| Stable | `4.12.0` | All users (default) |
| Beta | `4.12.0-beta.1` | Beta opt-in users |
| Alpha | `4.12.0-alpha.1` | Alpha opt-in users |

Every release — stable, beta, or alpha — uploads the same update metadata
(`latest.yml`, `latest-mac.yml`, `latest-linux.yml`); there is no
per-channel `.yml` filename. Channel separation instead comes from two
things: whether the GitHub release is marked **Pre-release** (true for
alpha/beta, false for stable), and whether the client has opted into
prereleases (electron-updater's `allowPrerelease` is enabled for the
alpha/beta channel settings, disabled for stable). A stable client's
updater ignores prerelease-flagged releases even though they share the
same `latest*.yml` file names.

**Channel hierarchy**: Alpha users receive alpha, beta, AND stable updates.
Beta users receive beta AND stable. Stable users only receive stable.

## The dev version invariant

`package.json`'s `"version"` on `dev` always equals the newest tag cut from
`dev`'s line:

- Right after promoting `4.16.0` to `master`, `dev` stays at `4.16.0`
  (it was just bumped there before the promotion PR).
- The first alpha of the next cycle bumps `dev` straight to
  `4.17.0-alpha.1` — start numbering at `.1`, never a phantom `.0` (there
  is no bare `4.17.0` tag until that cycle stabilizes).

## Creating an alpha release (on `dev`)

Alphas are cut directly from `dev` — no dedicated branch.

1. Update version on `dev`:

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

   Also increment `mac.bundleVersion` in `electron-builder.json` — it is
   independent from `package.json`'s `version` and Apple requires each
   submission's `CFBundleVersion` to strictly increase over the last one.
   Format: `YYMM` + a single-digit build counter that resets to `0` at the
   start of each month (e.g. the first build shipped in August 2026 is
   `26080`, the second same-month build is `26081`). Check the current
   value and the date of its last bump
   (`git log -p --follow -- electron-builder.json`) before incrementing —
   never guess an arbitrary increment.

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

   Always tag through `yarn release:tag` — never a bare `git tag` push. The
   script reads the version from `package.json`, verifies the channel-aware
   guard (an alpha tag must point at a commit that is an ancestor of
   `origin/dev`), refuses if the tag already exists or isn't greater than
   the latest tag in-channel, then tags HEAD and pushes.

4. CI builds automatically: pushing a semver tag is the **only** trigger for
   release builds (`build-release.yml` no longer runs on branch pushes). The
   workflow builds for all platforms, generates `latest.yml`,
   `latest-mac.yml`, `latest-linux.yml` metadata, and creates a **draft**
   GitHub release marked as Pre-release — that Pre-release flag, not the
   metadata file name, is what keeps the build away from stable clients.

5. Publish the release: open the draft on GitHub Releases, review the notes,
   click "Publish release". Nothing is visible to any client until a human
   publishes it.

## Promoting to a stable release (`dev` → `master`)

1. **Bump PR on `dev` first.** Drop the pre-release suffix in
   `package.json` (e.g. `4.17.0-alpha.6` → `4.17.0`), open a PR targeting
   `dev`, squash-merge it. This keeps the version invariant intact and
   ensures `master` never carries a version `dev` hasn't already reached.
2. **Release PR `dev` → `master`.** Open a PR from `dev` into `master`.
   Merge it with `gh pr merge --merge` — a **true merge commit**, never
   squash. Squashing a release PR forks history permanently: `master` would
   stop being a subset of `dev`'s commit graph, and every future diff
   between the branches becomes unreadable.
3. **Tag the merge commit on `master`**, via `yarn release:tag` (the
   channel-aware guard verifies a stable tag points at a commit that is an
   ancestor of `origin/master` or a `release/*` branch).
4. CI builds and drafts the release exactly as in the alpha flow; publish
   after asset verification.

## Patch releases (`release/X.Y.x`)

1. Ensure the patch line branch exists, cut from the stable tag it patches:

   ```bash
   git checkout -b release/4.16.x 4.16.0
   git push origin release/4.16.x
   ```

   If the branch already exists (an earlier patch), skip this step.

2. Fixes are authored and merged on `dev` first, then cherry-picked onto the
   release branch:

   ```bash
   git checkout release/4.16.x
   git cherry-pick <fix-commit-sha>
   ```

3. Bump PR targets the release branch (`package.json` → `4.16.1`), reviewed
   and merged there.
4. Tag on the release branch via `yarn release:tag` (the guard accepts a
   stable/patch tag whose commit is an ancestor of any `origin/release/*`
   branch, in addition to `origin/master`).
5. CI builds and drafts the release the same way; publish after verification.

## The never-back-merge rule

`master` never merges back into `dev`, and a `release/X.Y.x` branch never
merges back into `dev` either. Bumping `dev` before promoting to `master`
(and cherry-picking fixes down to patch lines from `dev`, not the reverse)
keeps `master` a pure superset of `dev`'s history — there is nothing on
`master` that needs to flow back.

**Single exception**: a hotfix authored directly on a `release/X.Y.x`
branch (rather than on `dev` and cherry-picked down) MUST be forward-ported
to `dev` immediately, via a small cherry-pick PR. Otherwise the fix is
silently lost the next time `dev` promotes to `master`.

## How users opt into alpha/beta channels

### Option A: Via the App UI (recommended)

1. Open **Settings** in the app (gear icon).
2. Enable **Developer Mode** (scroll down to find it).
3. Go to **Help > About** (or **Rocket.Chat > About** on macOS).
4. You will see an **Update Channel** dropdown. Select the desired channel:
   - **Stable** - Production releases only
   - **Beta** - Beta and stable releases
   - **Alpha (Experimental)** - Alpha, beta, and stable releases
5. Click **Check for Updates**.

The setting is persisted automatically and survives app restarts.

### Option B: Configuration file (for managed deployments)

Create `update.json` in the user data directory:

| Platform | Location |
|----------|----------|
| Windows | `%APPDATA%\Rocket.Chat\update.json` |
| macOS | `~/Library/Application Support/Rocket.Chat/update.json` |
| Linux | `~/.config/Rocket.Chat/update.json` |

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

1. Open Settings > Enable Developer Mode.
2. Open About dialog.
3. Select the desired channel from the dropdown.
4. Click "Check for Updates". The next pre-release version will be offered.

### Switching back to stable (alpha/beta → stable)

1. Open About dialog.
2. Select "Stable" from the Update Channel dropdown.
3. Click "Check for Updates".

**Important**: Switching to stable does NOT automatically downgrade the
app. What happens:

- If you're on `4.12.0-alpha.2` and switch to the stable channel, you will
  receive the next **stable** release (e.g., `4.12.0`); semver considers
  `4.12.0` greater than `4.12.0-alpha.2`, so it is offered as an update. You
  won't receive further alpha/beta releases until you switch back.
- If you need to immediately downgrade: uninstall the current version, then
  download and install the stable version from GitHub releases.

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

- Stable users **never** see alpha/beta releases (they check `latest.yml`
  only).
- Users must explicitly enable Developer Mode and select the alpha/beta
  channel.
- Alpha and beta releases are marked as "Pre-release" on GitHub.
- All release builds trigger **only** on semver tag pushes (never branch
  pushes) and always produce a **draft** release — a human reviews and
  publishes it explicitly. Nothing reaches any client before that.
- Channel selection is persisted and survives restarts.
- Users can switch channels at any time via the About dialog.

## Troubleshooting

### Update not showing after channel switch

1. Verify the release is published (not draft) on GitHub.
2. Check that `latest.yml`, `latest-mac.yml`, and `latest-linux.yml` exist
   in the release assets, and that the release's Pre-release flag matches
   the intended channel (checked for alpha/beta, unchecked for stable).
3. Click "Check for Updates" in the About dialog.
4. Restart the app and try again.

### Channel dropdown not visible

1. Make sure **Developer Mode** is enabled in Settings.
2. Close and reopen the About dialog.
3. Restart the app completely.

### Checking current channel

With Developer Mode enabled, open the About dialog - the current channel is
shown in the dropdown selector.

### Where settings are stored

The channel preference is stored in the app's config file:

- **Windows**: `%APPDATA%\Rocket.Chat\config.json`
- **macOS**: `~/Library/Application Support/Rocket.Chat/config.json`
- **Linux**: `~/.config/Rocket.Chat/config.json`

Look for the `updateChannel` key (values: `latest`, `beta`, or `alpha`).
