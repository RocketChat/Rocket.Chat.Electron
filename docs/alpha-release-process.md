# Alpha Release Process

This document describes how to create alpha releases for QA testing and early customer access.

## Overview

The Rocket.Chat Desktop app supports three release channels:
- **Stable** (`latest`) - Production releases for all users
- **Beta** - Pre-release testing with broader audience
- **Alpha** - Early testing for QA and select customers

## How Channels Work

| Channel | Version Format | Who Gets It | Update File |
| ------- | ------------- | ----------- | ----------- |
| Stable | `4.12.0` | All users (default) | `latest.yml` |
| Beta | `4.12.0-beta.1` | Beta opt-in users | `beta.yml` |
| Alpha | `4.12.0-alpha.1` | Alpha opt-in users | `alpha.yml` |

**Channel hierarchy**: Alpha users receive alpha, beta, AND stable updates. Beta users receive beta AND stable. Stable users only receive stable.

## Creating an Alpha Release

### 1. Create Release Branch

```bash
git checkout master
git pull
git checkout -b release/4.12.0-alpha.1
```

### 2. Update Version

Edit `package.json`:
```json
{
  "version": "4.12.0-alpha.1"
}
```

### 3. Commit and Push

```bash
git add package.json
git commit -m "chore: bump version to 4.12.0-alpha.1"
git push origin release/4.12.0-alpha.1
```

### 4. Create and Push Tag

```bash
git tag 4.12.0-alpha.1
git push origin 4.12.0-alpha.1
```

### 5. CI Builds Automatically

The GitHub Actions workflow triggers on tag push and:
- Builds for all platforms (Windows, macOS, Linux)
- Generates `alpha.yml`, `alpha-mac.yml`, `alpha-linux.yml` metadata
- Creates a draft GitHub release marked as **Pre-release**
- Publishes Linux snap to the `edge` channel

### 6. Publish the Release

1. Go to GitHub Releases
2. Find the draft release for your version
3. Review the release notes
4. Click "Publish release"

## How Users Opt Into Alpha

### Option A: Developer Mode (Recommended for QA)

1. Open Settings in the app
2. Enable **Developer Mode**
3. Open **About** dialog (Help > About)
4. Select **Alpha (Experimental)** from the Update Channel dropdown
5. Click **Check for Updates**

The setting persists - users don't need to select it again.

### Option B: Configuration File (For Managed Deployments)

Create `update.json` in the user data directory:

| Platform | Location |
| -------- | -------- |
| Windows | `%APPDATA%\Rocket.Chat\update.json` |
| macOS | `~/Library/Application Support/Rocket.Chat/update.json` |
| Linux | `~/.config/Rocket.Chat/update.json` |

Content:
```json
{
  "channel": "alpha"
}
```

For enterprise deployments where you want to force the setting:
```json
{
  "channel": "alpha",
  "forced": true
}
```

## Version Numbering Guidelines

- **Alpha**: `4.12.0-alpha.1`, `4.12.0-alpha.2`, etc.
- **Beta**: `4.12.0-beta.1`, `4.12.0-beta.2`, etc.
- **Stable**: `4.12.0`

When promoting:
- Alpha `4.12.0-alpha.5` → Beta `4.12.0-beta.1`
- Beta `4.12.0-beta.3` → Stable `4.12.0`

## Safety Guarantees

- Stable users **never** see alpha releases (they check `latest.yml`, not `alpha.yml`)
- Users must explicitly opt into alpha channel
- Alpha releases are marked as "Pre-release" on GitHub
- Users can switch back to stable at any time

## Troubleshooting

### Alpha update not showing

1. Verify the release is published (not draft)
2. Check that `alpha.yml` exists in the release assets
3. Ensure user has selected "Alpha" channel
4. Check for updates manually via About dialog

### Checking current channel

In Developer Mode, open About dialog - the current channel is shown in the dropdown.
