# Silent Installation Guide

This document provides comprehensive instructions for silent/unattended installation of the Rocket.Chat Desktop application across all supported operating systems.

## Table of Contents

- [Supported Platforms](#supported-platforms)
- [System Requirements](#system-requirements)
- [Windows Installation](#windows-installation)
  - [NSIS Installer (.exe)](#nsis-installer-exe)
  - [MSI Installer (.msi)](#msi-installer-msi)
- [macOS Installation](#macos-installation)
  - [PKG Installer (.pkg)](#pkg-installer-pkg)
  - [DMG Image (.dmg)](#dmg-image-dmg)
- [Linux Installation](#linux-installation)
  - [Debian/Ubuntu (.deb)](#debianubuntu-deb)
  - [Red Hat/Fedora (.rpm)](#red-hatfedora-rpm)
  - [AppImage](#appimage)
  - [Snap](#snap)
  - [Flatpak](#flatpak)
- [Post-Installation Configuration](#post-installation-configuration)
  - [Server Configuration (servers.json)](#server-configuration-serversjson)
  - [Settings Override (overridden-settings.json)](#settings-override-overridden-settingsjson)
- [Application Command-Line Arguments](#application-command-line-arguments)
- [Enterprise Deployment Scenarios](#enterprise-deployment-scenarios)
- [Verifying Installation](#verifying-installation)
- [Troubleshooting](#troubleshooting)
- [Exit Codes](#exit-codes)

---

## Supported Platforms

| Platform | Installer Types                   | Silent Install Support            |
| -------- | --------------------------------- | --------------------------------- |
| Windows  | NSIS (.exe), MSI (.msi)           | Full support                      |
| macOS    | PKG (.pkg), DMG (.dmg)            | Full support (PKG), Partial (DMG) |
| Linux    | DEB, RPM, AppImage, Snap, Flatpak | Full support                      |

---

## System Requirements

| Platform | Minimum OS Version              | Architecture        | Disk Space |
| -------- | ------------------------------- | ------------------- | ---------- |
| Windows  | Windows 10 or later             | x64, ia32, arm64    | ~200 MB    |
| macOS    | macOS 10.15 (Catalina) or later | x64, arm64 (M1/M2)  | ~250 MB    |
| Linux    | Ubuntu 20.04 / RHEL 8 or later  | x64, arm64          | ~200 MB    |

### Network Requirements

- HTTPS (port 443) access to your Rocket.Chat server
- For auto-updates: HTTPS access to `github.com` and `releases.rocket.chat`

---

## Windows Installation

### NSIS Installer (.exe)

The NSIS installer is the recommended method for Windows installations. It supports full silent installation with customizable options.

#### Basic Silent Installation

```cmd
rocketchat-<version>-win-x64.exe /S
```

#### Available Command-Line Flags

| Flag                  | Description                                                |
| --------------------- | ---------------------------------------------------------- |
| `/S`                  | Silent install - no user interface or prompts              |
| `/allusers`           | Install for all users (requires administrator privileges)  |
| `/currentuser`        | Install for current user only (default)                    |
| `/disableAutoUpdates` | Disable automatic updates after installation               |
| `/D=<path>`           | Set custom installation directory (must be last parameter) |
| `/NCRC`               | Skip CRC integrity check (use with caution)                |

#### Examples

**Silent install for current user:**

```cmd
rocketchat-4.11.1-win-x64.exe /S
```

**Silent install for all users:**

```cmd
rocketchat-4.11.1-win-x64.exe /S /allusers
```

**Silent install with auto-updates disabled:**

```cmd
rocketchat-4.11.1-win-x64.exe /S /disableAutoUpdates
```

**Silent install to custom directory:**

```cmd
rocketchat-4.11.1-win-x64.exe /S /D=C:\Apps\RocketChat
```

**Full enterprise deployment (all users, no updates, custom path):**

```cmd
rocketchat-4.11.1-win-x64.exe /S /allusers /disableAutoUpdates /D=C:\Program Files\RocketChat
```

#### Silent Uninstallation

```cmd
"C:\Program Files\Rocket.Chat\Uninstall Rocket.Chat.exe" /S
```

> **Note**: The `/D=<path>` parameter must be the last parameter on the command line and must not contain quotes, even if the path contains spaces.

#### Installation Paths

| Installation Type         | Default Path                           |
| ------------------------- | -------------------------------------- |
| Per-user (`/currentuser`) | `%LOCALAPPDATA%\Programs\Rocket.Chat\` |
| All users (`/allusers`)   | `%PROGRAMFILES%\Rocket.Chat\`          |

---

### MSI Installer (.msi)

The MSI installer is ideal for enterprise deployments using Group Policy, SCCM, Intune, or other deployment tools.

#### Basic Silent Installation

```cmd
msiexec /i rocketchat-<version>-win-x64.msi /quiet
```

#### Available msiexec Options

| Option             | Description                         |
| ------------------ | ----------------------------------- |
| `/i`               | Install the product                 |
| `/x`               | Uninstall the product               |
| `/quiet`           | Quiet mode - no user interaction    |
| `/qn`              | No UI at all                        |
| `/qb`              | Basic UI (progress bar only)        |
| `/qr`              | Reduced UI                          |
| `/qf`              | Full UI                             |
| `/passive`         | Unattended mode - progress bar only |
| `/norestart`       | Suppress restart after installation |
| `/forcerestart`    | Force restart after installation    |
| `/l*v <logfile>`   | Verbose logging to file             |
| `TARGETDIR=<path>` | Custom installation directory       |
| `ALLUSERS=1`       | Install for all users               |
| `ALLUSERS=""`      | Install for current user            |

#### Examples

**Silent install (no UI):**

```cmd
msiexec /i rocketchat-4.11.1-win-x64.msi /qn
```

**Silent install with progress bar:**

```cmd
msiexec /i rocketchat-4.11.1-win-x64.msi /passive
```

**Silent install for all users:**

```cmd
msiexec /i rocketchat-4.11.1-win-x64.msi /qn ALLUSERS=1
```

**Silent install with logging:**

```cmd
msiexec /i rocketchat-4.11.1-win-x64.msi /qn /l*v C:\Logs\rocketchat-install.log
```

**Silent install with custom directory:**

```cmd
msiexec /i rocketchat-4.11.1-win-x64.msi /qn TARGETDIR="C:\Apps\RocketChat"
```

**Silent install without restart:**

```cmd
msiexec /i rocketchat-4.11.1-win-x64.msi /qn /norestart
```

**Full enterprise deployment:**

```cmd
msiexec /i rocketchat-4.11.1-win-x64.msi /qn ALLUSERS=1 /norestart /l*v C:\Logs\install.log
```

#### Silent Uninstallation

```cmd
msiexec /x rocketchat-4.11.1-win-x64.msi /qn
```

Or by product code:

```cmd
msiexec /x {PRODUCT-CODE-GUID} /qn
```

---

## macOS Installation

### PKG Installer (.pkg)

The PKG installer supports silent installation using the macOS `installer` command.

#### Basic Silent Installation

```bash
sudo installer -pkg rocketchat-<version>-mac.pkg -target /
```

#### Available Options

| Option             | Description                             |
| ------------------ | --------------------------------------- |
| `-pkg <path>`      | Path to the package file                |
| `-target <volume>` | Target volume (use `/` for main disk)   |
| `-verboseR`        | Verbose output                          |
| `-dumplog`         | Dump installation log                   |
| `-allowUntrusted`  | Allow installation of unsigned packages |

#### Examples

**Silent install to main disk:**

```bash
sudo installer -pkg rocketchat-4.11.1-mac.pkg -target /
```

**Silent install with verbose output:**

```bash
sudo installer -pkg rocketchat-4.11.1-mac.pkg -target / -verboseR
```

**Silent install with logging:**

```bash
sudo installer -pkg rocketchat-4.11.1-mac.pkg -target / -dumplog 2>&1 | tee /tmp/rocketchat-install.log
```

#### Installation Path

The PKG installer installs Rocket.Chat to `/Applications/Rocket.Chat.app`.

---

### DMG Image (.dmg)

DMG files require mounting and copying. This can be automated with a script.

#### Automated DMG Installation Script

```bash
#!/bin/bash

DMG_FILE="rocketchat-4.11.1-mac.dmg"
MOUNT_POINT="/Volumes/Rocket.Chat"
APP_NAME="Rocket.Chat.app"
INSTALL_PATH="/Applications"

# Mount the DMG
hdiutil attach "$DMG_FILE" -nobrowse -quiet

# Copy the application
cp -R "$MOUNT_POINT/$APP_NAME" "$INSTALL_PATH/"

# Unmount the DMG
hdiutil detach "$MOUNT_POINT" -quiet

# Remove quarantine attribute (if needed)
xattr -cr "$INSTALL_PATH/$APP_NAME"

echo "Rocket.Chat installed successfully"
```

#### One-liner Installation

```bash
hdiutil attach rocketchat-4.11.1-mac.dmg -nobrowse -quiet && \
cp -R "/Volumes/Rocket.Chat/Rocket.Chat.app" /Applications/ && \
hdiutil detach "/Volumes/Rocket.Chat" -quiet
```

---

## Linux Installation

### Debian/Ubuntu (.deb)

#### Using dpkg (Basic)

```bash
sudo dpkg -i rocketchat-<version>-linux-amd64.deb
```

#### Using apt (Recommended - handles dependencies)

```bash
sudo apt install ./rocketchat-<version>-linux-amd64.deb -y
```

#### Non-interactive Installation

```bash
export DEBIAN_FRONTEND=noninteractive
sudo apt install ./rocketchat-4.11.1-linux-amd64.deb -y
```

#### Silent Uninstallation

```bash
sudo apt remove rocketchat-desktop -y
# Or to also remove configuration:
sudo apt purge rocketchat-desktop -y
```

---

### Red Hat/Fedora (.rpm)

#### Using rpm (Basic)

```bash
sudo rpm -i rocketchat-<version>-linux-x86_64.rpm
```

#### Using dnf (Fedora - Recommended)

```bash
sudo dnf install ./rocketchat-<version>-linux-x86_64.rpm -y
```

#### Using yum (CentOS/RHEL)

```bash
sudo yum install ./rocketchat-<version>-linux-x86_64.rpm -y
```

#### Silent Uninstallation

```bash
sudo dnf remove rocketchat-desktop -y
# Or with yum:
sudo yum remove rocketchat-desktop -y
```

---

### AppImage

AppImage files are self-contained and don't require installation. Simply download, make executable, and run.

#### Setup

```bash
# Download the AppImage
wget https://github.com/RocketChat/Rocket.Chat.Electron/releases/download/<version>/rocketchat-<version>-linux-x86_64.AppImage

# Make executable
chmod +x rocketchat-<version>-linux-x86_64.AppImage

# Run
./rocketchat-<version>-linux-x86_64.AppImage
```

#### System-wide Installation

```bash
# Move to /opt
sudo mv rocketchat-<version>-linux-x86_64.AppImage /opt/rocketchat.AppImage
sudo chmod +x /opt/rocketchat.AppImage

# Create desktop entry
cat << EOF | sudo tee /usr/share/applications/rocketchat.desktop
[Desktop Entry]
Name=Rocket.Chat
Exec=/opt/rocketchat.AppImage
Icon=rocketchat
Type=Application
Categories=Network;InstantMessaging;
EOF
```

#### AppImage Options

```bash
# Run with custom flags
./rocketchat.AppImage --disable-gpu
./rocketchat.AppImage --ozone-platform=x11
./rocketchat.AppImage --start-hidden
```

---

### Snap

#### Installation

```bash
# From Snap Store
sudo snap install rocketchat-desktop

# Silent/non-interactive
sudo snap install rocketchat-desktop 2>/dev/null
```

#### Available Channels

```bash
# Stable (default)
sudo snap install rocketchat-desktop

# Beta channel
sudo snap install rocketchat-desktop --beta

# Edge channel (latest development)
sudo snap install rocketchat-desktop --edge
```

#### Silent Uninstallation

```bash
sudo snap remove rocketchat-desktop
```

---

### Flatpak

#### Installation

```bash
# Add Flathub repository (if not already added)
flatpak remote-add --if-not-exists flathub https://flathub.org/repo/flathub.flatpakrepo

# Install Rocket.Chat
flatpak install flathub chat.rocket.RocketChat -y
```

#### System-wide Installation

```bash
sudo flatpak install --system flathub chat.rocket.RocketChat -y
```

#### Silent Uninstallation

```bash
flatpak uninstall chat.rocket.RocketChat -y
```

---

## Post-Installation Configuration

### Server Configuration (servers.json)

Pre-configure the default server(s) that users connect to by creating a `servers.json` file.

#### File Locations

| Platform | Per-User Location                            | System-Wide Location                    |
| -------- | -------------------------------------------- | --------------------------------------- |
| Windows  | `%APPDATA%\Rocket.Chat\`                     | `%PROGRAMFILES%\Rocket.Chat\Resources\` |
| macOS    | `~/Library/Application Support/Rocket.Chat/` | `/Library/Preferences/Rocket.Chat/`     |
| Linux    | `~/.config/Rocket.Chat/`                     | `/opt/Rocket.Chat/resources/`           |

#### File Format

```json
{
  "My Company Chat": "https://chat.mycompany.com",
  "Rocket.Chat Community": "https://open.rocket.chat"
}
```

#### Single Server Mode

To connect directly to a single server without showing the server selection screen:

```json
{
  "Production": "https://chat.mycompany.com"
}
```

#### Pre-bundling During Build

Place `servers.json` in the project root before building to bundle it with the installer.

---

### Settings Override (overridden-settings.json)

Override user settings for enterprise deployments by creating an `overridden-settings.json` file.

#### File Locations

Same locations as `servers.json` (see table above).

#### Available Settings

| Setting                            | Type    | Default | Description                            |
| ---------------------------------- | ------- | ------- | -------------------------------------- |
| `isReportEnabled`                  | boolean | `false` | Enable/disable bug reporting           |
| `isInternalVideoChatWindowEnabled` | boolean | `false` | Open video calls in internal window    |
| `isFlashFrameEnabled`              | boolean | `false` | Flash taskbar on new messages          |
| `isMinimizeOnCloseEnabled`         | boolean | `false` | Minimize to taskbar instead of closing |
| `doCheckForUpdatesOnStartup`       | boolean | `true`  | Check for updates on startup           |
| `isMenuBarEnabled`                 | boolean | `true`  | Show menu bar                          |
| `isTrayIconEnabled`                | boolean | `true`  | Enable system tray icon                |
| `isUpdatingEnabled`                | boolean | `true`  | Allow user to update the app           |
| `isAddNewServersEnabled`           | boolean | `true`  | Allow adding new servers               |

#### Example: Enterprise Lockdown Configuration

```json
{
  "isAddNewServersEnabled": false,
  "isUpdatingEnabled": false,
  "doCheckForUpdatesOnStartup": false,
  "isTrayIconEnabled": true,
  "isMinimizeOnCloseEnabled": false
}
```

This configuration:

- Prevents users from adding new servers (single server mode)
- Disables user-initiated updates (IT-managed updates only)
- Disables update checks on startup
- Enables tray icon
- Closes app completely when window is closed

#### Example: Kiosk Mode Configuration

```json
{
  "isAddNewServersEnabled": false,
  "isUpdatingEnabled": false,
  "isMenuBarEnabled": false,
  "isTrayIconEnabled": false,
  "isMinimizeOnCloseEnabled": false
}
```

---

## Application Command-Line Arguments

These arguments are passed to the Rocket.Chat application itself (not the installer).

| Argument                   | Description                                                          |
| -------------------------- | -------------------------------------------------------------------- |
| `--start-hidden`           | Start the application minimized to tray                              |
| `--disable-gpu`            | Disable GPU hardware acceleration                                    |
| `--reset-app-data`         | Clear all application data and restart                               |
| `--ozone-platform=x11`     | Force X11 display server (Linux)                                     |
| `--ozone-platform=wayland` | Force Wayland display server (Linux)                                 |

#### Examples

**Start minimized to tray:**

```bash
# Windows
"C:\Program Files\Rocket.Chat\Rocket.Chat.exe" --start-hidden

# macOS
open -a "Rocket.Chat" --args --start-hidden

# Linux
rocketchat-desktop --start-hidden
```

**Disable GPU acceleration:**

```bash
rocketchat-desktop --disable-gpu
```

**Force X11 on Linux:**

```bash
rocketchat-desktop --ozone-platform=x11
```

---

## Enterprise Deployment Scenarios

### Scenario 1: Windows Group Policy Deployment

1. **Prepare the MSI installer**
2. **Create a Group Policy Object (GPO)**
3. **Configure software installation policy:**
   - Computer Configuration > Policies > Software Settings > Software Installation
   - Add the MSI package
   - Set to "Assigned" for automatic installation

### Scenario 2: SCCM/Intune Deployment

**Installation command:**

```cmd
msiexec /i rocketchat-<version>-win-x64.msi /qn ALLUSERS=1 /norestart
```

**Uninstallation command:**

```cmd
msiexec /x rocketchat-<version>-win-x64.msi /qn /norestart
```

**Detection rules:**

| Method        | Check                                                      |
| ------------- | ---------------------------------------------------------- |
| File exists   | `C:\Program Files\Rocket.Chat\Rocket.Chat.exe`             |
| Registry key  | `HKLM\SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall` |
| MSI product   | Query via `Get-WmiObject Win32_Product`                    |

### Scenario 3: macOS MDM Deployment (Jamf, Mosyle, etc.)

1. Upload the PKG installer to your MDM
2. Configure pre-install script to create `servers.json`:

```bash
#!/bin/bash
mkdir -p "/Library/Preferences/Rocket.Chat"
cat > "/Library/Preferences/Rocket.Chat/servers.json" << 'EOF'
{
  "Company Chat": "https://chat.company.com"
}
EOF
```

3. Deploy via MDM policy

### Scenario 4: Linux Mass Deployment (Ansible)

```yaml
- name: Install Rocket.Chat Desktop
  hosts: workstations
  become: yes
  tasks:
    - name: Install Rocket.Chat (Debian/Ubuntu)
      apt:
        deb: 'https://github.com/RocketChat/Rocket.Chat.Electron/releases/download/4.11.1/rocketchat-4.11.1-linux-amd64.deb'
      when: ansible_os_family == "Debian"

    - name: Install Rocket.Chat (RHEL/Fedora)
      dnf:
        name: 'https://github.com/RocketChat/Rocket.Chat.Electron/releases/download/4.11.1/rocketchat-4.11.1-linux-x86_64.rpm'
        state: present
        disable_gpg_check: yes
      when: ansible_os_family == "RedHat"

    - name: Configure default server
      copy:
        content: |
          {
            "Company Chat": "https://chat.company.com"
          }
        dest: /opt/Rocket.Chat/resources/servers.json
        mode: '0644'
```

### Scenario 5: Docker/Container Deployment

For testing or specific use cases, you can run Rocket.Chat Desktop in a container:

```dockerfile
FROM ubuntu:22.04

RUN apt-get update && apt-get install -y \
    wget \
    libgtk-3-0 \
    libnotify4 \
    libnss3 \
    libxss1 \
    libxtst6 \
    xdg-utils \
    libatspi2.0-0 \
    libuuid1 \
    libsecret-1-0

RUN wget -O /tmp/rocketchat.deb \
    https://github.com/RocketChat/Rocket.Chat.Electron/releases/download/4.11.1/rocketchat-4.11.1-linux-amd64.deb && \
    apt-get install -y /tmp/rocketchat.deb && \
    rm /tmp/rocketchat.deb

# Pre-configure server
RUN mkdir -p /opt/Rocket.Chat/resources && \
    echo '{"Company": "https://chat.company.com"}' > /opt/Rocket.Chat/resources/servers.json

CMD ["rocketchat-desktop", "--no-sandbox"]
```

---

## Verifying Installation

### Windows

```powershell
# Check if executable exists
Test-Path "C:\Program Files\Rocket.Chat\Rocket.Chat.exe"

# Get installed version
(Get-Item "C:\Program Files\Rocket.Chat\Rocket.Chat.exe").VersionInfo.ProductVersion
```

### macOS

```bash
# Check if app exists
test -d "/Applications/Rocket.Chat.app" && echo "Installed"

# Get installed version
defaults read /Applications/Rocket.Chat.app/Contents/Info.plist CFBundleShortVersionString
```

### Linux

```bash
# Debian/Ubuntu
dpkg -l | grep rocketchat

# RHEL/Fedora
rpm -qa | grep rocketchat

# Get version
rocketchat-desktop --version
```

---

## Troubleshooting

### Windows Installation Issues

**Problem**: Silent install requires UAC elevation
**Solution**: Run from elevated command prompt or use `/currentuser` flag

**Problem**: MSI installation fails with error 1603
**Solution**: Check Windows Installer service is running:

```cmd
net start msiserver
```

### macOS Installation Issues

**Problem**: "App is damaged and can't be opened"
**Solution**: Remove quarantine attribute:

```bash
xattr -cr /Applications/Rocket.Chat.app
```

**Problem**: PKG installation requires password
**Solution**: Use `sudo` with the installer command

### Linux Installation Issues

**Problem**: AppImage doesn't start on Wayland
**Solution**: Force X11:

```bash
./rocketchat.AppImage --ozone-platform=x11
```

**Problem**: Missing dependencies on Debian
**Solution**: Install dependencies:

```bash
sudo apt install -f
```

---

## Quick Reference

### Windows Quick Reference

| Installer | Command         | Silent Flag | Example                             |
| --------- | --------------- | ----------- | ----------------------------------- |
| NSIS      | `installer.exe` | `/S`        | `setup.exe /S /allusers`            |
| MSI       | `msiexec /i`    | `/qn`       | `msiexec /i app.msi /qn ALLUSERS=1` |

### macOS Quick Reference

| Installer | Command          | Notes              | Example                                         |
| --------- | ---------------- | ------------------ | ----------------------------------------------- |
| PKG       | `sudo installer` | Always silent      | `sudo installer -pkg app.pkg -target /`         |
| DMG       | `hdiutil` + `cp` | Requires scripting | `hdiutil attach && cp -R ... && hdiutil detach` |

### Linux Quick Reference

| Format   | Command                   | Silent Flag   | Example                                             |
| -------- | ------------------------- | ------------- | --------------------------------------------------- |
| DEB      | `apt install` / `dpkg -i` | `-y`          | `sudo apt install ./app.deb -y`                     |
| RPM      | `dnf install` / `rpm -i`  | `-y`          | `sudo dnf install ./app.rpm -y`                     |
| AppImage | `chmod +x` + `./`         | N/A           | `./app.AppImage`                                    |
| Snap     | `snap install`            | (none needed) | `sudo snap install rocketchat-desktop`              |
| Flatpak  | `flatpak install`         | `-y`          | `flatpak install flathub chat.rocket.RocketChat -y` |

---

## Automation Best Practices

### Error Handling

**Windows (Batch):**

```cmd
@echo off
rocketchat-4.11.1-win-x64.exe /S /allusers
if %ERRORLEVEL% NEQ 0 (
    echo Installation failed with error code %ERRORLEVEL%
    exit /b %ERRORLEVEL%
)
echo Installation completed successfully
```

**Windows (PowerShell):**

```powershell
$process = Start-Process -FilePath "rocketchat-4.11.1-win-x64.exe" -ArgumentList "/S", "/allusers" -Wait -PassThru
if ($process.ExitCode -ne 0) {
    Write-Error "Installation failed with exit code: $($process.ExitCode)"
    exit $process.ExitCode
}
Write-Host "Installation completed successfully"
```

**macOS/Linux (Bash):**

```bash
#!/bin/bash
set -e

if sudo installer -pkg rocketchat-4.11.1-mac.pkg -target / -verboseR; then
    echo "Installation completed successfully"
else
    echo "Installation failed. Check /var/log/install.log for details"
    exit 1
fi
```

### Logging

**Windows MSI with detailed logging:**

```cmd
msiexec /i rocketchat-4.11.1-win-x64.msi /l*v "C:\Logs\rocketchat-%date:~-4,4%%date:~-10,2%%date:~-7,2%.log" /qn
```

**macOS PKG with logging:**

```bash
sudo installer -pkg rocketchat-4.11.1-mac.pkg -target / -dumplog 2>&1 | tee /var/log/rocketchat-install.log
```

**Linux with logging:**

```bash
sudo apt install ./rocketchat-4.11.1-linux-amd64.deb -y 2>&1 | tee /var/log/rocketchat-install.log
```

---

## Exit Codes

### Windows NSIS Installer

| Code | Meaning                              |
| ---- | ------------------------------------ |
| 0    | Success                              |
| 1    | Installation aborted by user         |
| 2    | Installation aborted due to error    |

### Windows MSI (msiexec)

| Code | Meaning                                    |
| ---- | ------------------------------------------ |
| 0    | Success                                    |
| 1603 | Fatal error during installation            |
| 1618 | Another installation already in progress   |
| 1619 | Package could not be opened                |
| 3010 | Success, reboot required                   |

### macOS/Linux

| Code | Meaning                              |
| ---- | ------------------------------------ |
| 0    | Success                              |
| 1    | General error                        |

---

## Version Information

- **Document Version**: 1.1
- **Last Updated**: January 2025
- **Applies To**: Rocket.Chat Desktop 4.x and later
