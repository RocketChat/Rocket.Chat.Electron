# Alpha and Beta Release Process

This document describes how to create alpha and beta releases for QA testing and early customer access.

## Overview

The Rocket.Chat Desktop app supports three release channels:
- **Stable** (`latest`) - Production releases for all users
- **Beta** - Pre-release testing with broader audience
- **Alpha** - Early testing for QA and select customers

## How Channels Work

| Channel | Version Format | Who Gets It | Update File |
|---------|---------------|-------------|-------------|
| Stable | `4.12.0` | All users (default) | `latest.yml` |
| Beta | `4.12.0-beta.1` | Beta opt-in users | `beta.yml` |
| Alpha | `4.12.0-alpha.1` | Alpha opt-in users | `alpha.yml` |

**Channel hierarchy**: Alpha users receive alpha, beta, AND stable updates. Beta users receive beta AND stable. Stable users only receive stable.

## Creating an Alpha Release

### 1. Update Version on dev branch

```bash
git checkout dev
git pull origin dev
```

Edit `package.json`:
```json
{
  "version": "4.12.0-alpha.1"
}
```

Also increment `bundleVersion` in `electron-builder.json`.

### 2. Commit and Push

```bash
git add package.json electron-builder.json
git commit -m "chore: bump version to 4.12.0-alpha.1"
git push origin dev
```

### 3. Create and Push Tag

```bash
git tag 4.12.0-alpha.1
git push origin 4.12.0-alpha.1
```

Or use the release-tag script:
```bash
npx ts-node scripts/release-tag.ts
```

### 4. CI Builds Automatically

The GitHub Actions workflow triggers on tag push and:
- Builds for all platforms (Windows, macOS, Linux)
- Generates `alpha.yml`, `alpha-mac.yml`, `alpha-linux.yml` metadata
- Creates a draft GitHub release marked as **Pre-release**
- Publishes Linux snap to the `edge` channel

### 5. Publish the Release

1. Go to GitHub Releases
2. Find the draft release for your version
3. Review the release notes
4. Click "Publish release"

## Creating a Beta Release

Beta releases follow the same process as alpha, but use `-beta.X` suffix:

```bash
git checkout dev
# Edit package.json to "4.12.0-beta.1"
git commit -am "chore: bump version to 4.12.0-beta.1"
git push origin dev
git tag 4.12.0-beta.1
git push origin 4.12.0-beta.1
```

## How Users Opt Into Alpha/Beta Channels

### Option A: Via the App UI (Recommended)

1. Open **Settings** in the app (gear icon)
2. Enable **Developer Mode** (scroll down to find it)
3. Go to **Help > About** (or **Rocket.Chat > About** on macOS)
4. You will see an **Update Channel** dropdown
5. Select the desired channel:
   - **Stable** - Production releases only
   - **Beta** - Beta and stable releases
   - **Alpha (Experimental)** - Alpha, beta, and stable releases
6. Click **Check for Updates**

The setting is persisted automatically and survives app restarts.

### Option B: Configuration File (For Managed Deployments)

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

For enterprise deployments where you want to force the setting (users cannot change it):
```json
{
  "channel": "beta",
  "forced": true
}
```

## Switching Channels

### Switching to a prerelease channel (stable → alpha/beta)

1. Open Settings > Enable Developer Mode
2. Open About dialog
3. Select the desired channel from dropdown
4. Click "Check for Updates"
5. The next prerelease version will be offered

### Switching back to stable (alpha/beta → stable)

1. Open About dialog
2. Select "Stable" from the Update Channel dropdown
3. Click "Check for Updates"

**Important**: Switching to stable does NOT automatically downgrade the app. What happens:

- If you're on `4.12.0-alpha.2` and switch to stable channel:
  - You will receive the next **stable** release (e.g., `4.12.0`)
  - Semver considers `4.12.0` greater than `4.12.0-alpha.2`, so the stable release will be offered as an update
  - You won't receive further alpha/beta releases until you switch back

- If you need to immediately downgrade:
  - Uninstall the current version
  - Download and install the stable version from GitHub releases

## Version Numbering Guidelines

- **Alpha**: `4.12.0-alpha.1`, `4.12.0-alpha.2`, etc.
- **Beta**: `4.12.0-beta.1`, `4.12.0-beta.2`, etc.
- **Stable**: `4.12.0`

When promoting:
- Alpha `4.12.0-alpha.5` → Beta `4.12.0-beta.1`
- Beta `4.12.0-beta.3` → Stable `4.12.0`

Typical release progression:
```
4.12.0-alpha.1 → 4.12.0-alpha.2 → 4.12.0-beta.1 → 4.12.0-beta.2 → 4.12.0
```

## Safety Guarantees

- Stable users **never** see alpha/beta releases (they check `latest.yml` only)
- Users must explicitly enable Developer Mode and select alpha/beta channel
- Alpha and beta releases are marked as "Pre-release" on GitHub
- Channel selection is persisted and survives restarts
- Users can switch channels at any time via the About dialog

## Troubleshooting

### Update not showing after channel switch

1. Verify the release is published (not draft) on GitHub
2. Check that the corresponding `.yml` file exists in the release assets:
   - Alpha: `alpha.yml`, `alpha-mac.yml`, `alpha-linux.yml`
   - Beta: `beta.yml`, `beta-mac.yml`, `beta-linux.yml`
3. Click "Check for Updates" in the About dialog
4. Restart the app and try again

### Channel dropdown not visible

1. Make sure **Developer Mode** is enabled in Settings
2. Close and reopen the About dialog
3. Restart the app completely

### Checking current channel

With Developer Mode enabled, open the About dialog - the current channel is shown in the dropdown selector.

### Where settings are stored

The channel preference is stored in the app's config file:
- **Windows**: `%APPDATA%\Rocket.Chat\config.json`
- **macOS**: `~/Library/Application Support/Rocket.Chat/config.json`
- **Linux**: `~/.config/Rocket.Chat/config.json`

Look for the `updateChannel` key (values: `latest`, `beta`, or `alpha`).
