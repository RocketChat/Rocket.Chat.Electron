# QA Testing: Alpha Channel Updates

This guide explains how to test the alpha update flow from `4.12.0-alpha.1` to `4.12.0-alpha.2`.

## Prerequisites

- Access to the GitHub releases page: https://github.com/RocketChat/Rocket.Chat.Electron/releases
- A clean test environment (no previous Rocket.Chat Desktop installation, or uninstall first)

## Step 1: Download and Install Alpha 1

1. Go to [GitHub Releases](https://github.com/RocketChat/Rocket.Chat.Electron/releases)
2. Find the release **4.12.0-alpha.1** (marked as "Pre-release")
3. Download the installer for your platform:
   - **Windows**: `rocketchat-4.12.0-alpha.1-win-x64.exe`
   - **macOS**: `rocketchat-4.12.0-alpha.1-mac-universal.dmg`
   - **Linux**: `rocketchat-4.12.0-alpha.1-linux-amd64.deb` or `.AppImage`
4. Install and launch the application

## Step 2: Verify Alpha 1 Version

1. Open the app
2. Go to **Help > About** (or **Rocket.Chat > About** on macOS)
3. Confirm the version shows **4.12.0-alpha.1**

## Step 3: Enable Alpha Update Channel

By default, the app checks for stable updates only. To receive alpha updates:

1. Go to **Settings** (gear icon)
2. Enable **Developer Mode** (scroll down to find it)
3. Go back to **Help > About**
4. You should now see an **Update Channel** dropdown
5. Select **Alpha (Experimental)** from the dropdown

## Step 4: Check for Updates

1. In the About dialog, click **Check for Updates**
2. The app should find **4.12.0-alpha.2** as an available update
3. You should see a notification or dialog indicating the new version

## Step 5: Install the Update

1. Click **Download** or **Install** when prompted
2. Wait for the download to complete
3. The app will prompt you to restart to apply the update
4. Click **Restart** (or close and reopen the app)

## Step 6: Verify Alpha 2 Version

1. After restart, go to **Help > About**
2. Confirm the version now shows **4.12.0-alpha.2**

## Expected Results

| Step | Expected Behavior |
|------|-------------------|
| Install Alpha 1 | App installs and runs without errors |
| About dialog | Shows version 4.12.0-alpha.1 |
| Enable Developer Mode | Update Channel dropdown appears in About |
| Select Alpha channel | Channel selection is saved |
| Check for Updates | Finds 4.12.0-alpha.2 |
| Download update | Downloads without errors |
| Restart | App restarts and applies update |
| Final version | Shows 4.12.0-alpha.2 |

## Troubleshooting

### Update not found

- Verify **Developer Mode** is enabled in Settings
- Confirm **Alpha** channel is selected in the About dialog
- Check that `4.12.0-alpha.2` release is published (not draft) on GitHub
- Try clicking **Check for Updates** again

### Update downloads but doesn't install

- Check your system permissions (may need admin rights on Windows)
- Try manually closing and reopening the app
- Check the app logs for errors

### Channel dropdown not visible

- Make sure Developer Mode is enabled
- Close and reopen the About dialog
- Restart the app completely

## Reporting Issues

When reporting issues, please include:

1. Operating system and version
2. Screenshot of the About dialog showing current version
3. Steps to reproduce the issue
4. Any error messages displayed
5. App logs if available:
   - **Windows**: `%APPDATA%\Rocket.Chat\logs`
   - **macOS**: `~/Library/Logs/Rocket.Chat`
   - **Linux**: `~/.config/Rocket.Chat/logs`
