# QA Testing: Alpha Channel Updates

This guide explains how to test the alpha update flow from any
**`X.Y.Z-alpha.N`** build to **`X.Y.Z-alpha.N+1`** (for example
`4.17.0-alpha.1` → `4.17.0-alpha.2`).

Cutting and publishing those alphas is documented in
[release-process.md](./release-process.md). This page is the client-side
check only.

In-app updates apply to GitHub **NSIS / MSI / DMG / PKG / AppImage**
installs. Store, Snap, and deb/rpm builds do not use electron-updater —
see [How updates work by install source](../README.md#how-updates-work-by-install-source).

## Prerequisites

- Access to the GitHub releases page: https://github.com/RocketChat/Rocket.Chat.Electron/releases
- A clean test environment (no previous Rocket.Chat Desktop installation, or uninstall first)
- Two consecutive published (not draft) pre-releases: `X.Y.Z-alpha.N` and `X.Y.Z-alpha.N+1`

## Step 1: Download and Install Alpha N

1. Go to [GitHub Releases](https://github.com/RocketChat/Rocket.Chat.Electron/releases)
2. Find the release **`X.Y.Z-alpha.N`** (marked as "Pre-release")
3. Download the installer for your platform, for example:
   - **Windows**: `rocketchat-X.Y.Z-alpha.N-win-x64.exe`
   - **macOS**: `rocketchat-X.Y.Z-alpha.N-mac.dmg` (or the universal DMG name shown on the release)
   - **Linux**: `rocketchat-X.Y.Z-alpha.N-linux-amd64.deb` or the `x86_64` AppImage
4. Install and launch the application

## Step 2: Verify Alpha N Version

1. Open the app
2. Go to **Help > About** (or **Rocket.Chat > About** on macOS)
3. Confirm the version shows **`X.Y.Z-alpha.N`**

## Step 3: Enable Alpha Update Channel

By default, the app checks for stable updates only. To receive alpha updates:

1. Open **Help** and enable the **Developer Mode** checkbox
2. Go to **Help > About** (or **Rocket.Chat > About** on macOS)
3. You should now see an **Update Channel** dropdown
4. Select **Alpha (Experimental)** from the dropdown

## Step 4: Check for Updates

1. In the About dialog, click **Check for Updates**
2. The app should find **`X.Y.Z-alpha.N+1`** as an available update
3. You should see a notification or dialog indicating the new version

## Step 5: Install the Update

1. Click **Download** or **Install** when prompted
2. Wait for the download to complete
3. The app will prompt you to restart to apply the update
4. Click **Restart** (or close and reopen the app)

## Step 6: Verify Alpha N+1 Version

1. After restart, go to **Help > About**
2. Confirm the version now shows **`X.Y.Z-alpha.N+1`**

## Expected Results

| Step | Expected Behavior |
|------|-------------------|
| Install Alpha N | App installs and runs without errors |
| About dialog | Shows version `X.Y.Z-alpha.N` |
| Enable Developer Mode | Update Channel dropdown appears in About |
| Select Alpha channel | Channel selection is saved |
| Check for Updates | Finds `X.Y.Z-alpha.N+1` |
| Download update | Downloads without errors |
| Restart | App restarts and applies update |
| Final version | Shows `X.Y.Z-alpha.N+1` |

## Troubleshooting

### Update not found

- Verify **Developer Mode** is enabled
- Confirm **Alpha** channel is selected in the About dialog
- Check that `X.Y.Z-alpha.N+1` is **published** (not draft) on GitHub
- Confirm this install type uses electron-updater (not MAS / Store / Snap / deb / rpm)
- Try clicking **Check for Updates** again
- See [release-process.md](./release-process.md) if the release metadata looks wrong

### Update downloads but doesn't install

- Check your system permissions (may need admin rights on Windows)
- Try manually closing and reopening the app
- Check the app logs — [troubleshooting.md](./troubleshooting.md)

### Channel dropdown not visible

- Make sure Developer Mode is enabled
- Close and reopen the About dialog
- Restart the app completely

## Reporting Issues

When reporting issues, please include:

1. Operating system and version
2. Installation type (NSIS / MSI / DMG / PKG / AppImage)
3. Screenshot of the About dialog showing current version
4. Steps to reproduce the issue
5. Any error messages displayed
6. A **Help → Open Log Viewer** export (or the on-disk logs in [troubleshooting.md](./troubleshooting.md))
