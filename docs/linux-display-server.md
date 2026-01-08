# Linux Display Server Configuration

Rocket.Chat Desktop supports both Wayland and X11 display servers on Linux, with automatic detection and safe fallback mechanisms.

## How It Works

Rocket.Chat Desktop uses a **wrapper script** to detect your display server before the application starts. This prevents crashes that occur when Chromium tries to connect to an unavailable Wayland compositor.

### Detection Logic

The wrapper checks (in order):
1. Is `XDG_SESSION_TYPE` set to `wayland`?
2. Is `WAYLAND_DISPLAY` set?
3. Does the Wayland socket actually exist?

If any check fails, the wrapper forces X11 mode via `--ozone-platform=x11`.

| Session Type | WAYLAND_DISPLAY | Socket Exists | Result |
|--------------|-----------------|---------------|--------|
| wayland | wayland-0 | Yes | Native Wayland |
| wayland | wayland-0 | No | Force X11 |
| wayland | (empty) | N/A | Force X11 |
| x11 | (any) | (any) | Force X11 |
| tty | (any) | (any) | Force X11 |

## Package Behavior

| Package Type | Display Server | Notes |
|--------------|---------------|-------|
| **deb/rpm** | Auto-detect via wrapper | Native Wayland when available, safe X11 fallback |
| **AppImage** | Auto-detect via wrapper | Native Wayland when available, safe X11 fallback |
| **Snap** | Auto-detect | Uses Snap's display server access |

## Why a Wrapper Script?

Chromium (which powers Electron) selects its display server during native initialization, **before** any JavaScript code runs. This means:

- `app.commandLine.appendSwitch()` in Electron code runs too late
- Environment variable checks in JavaScript run too late
- The only reliable fix is a shell wrapper that sets flags **before** the binary starts

For technical details, see [linux-wayland-bug-postmortem.md](./linux-wayland-bug-postmortem.md).

## Wayland Support

When running on a proper Wayland session, Rocket.Chat Desktop provides:
- Native Wayland rendering
- PipeWire screen capture for video calls
- Native OS screen picker integration
- Hardware acceleration

### Requirements for Wayland
- Active Wayland compositor with accessible socket
- `xdg-desktop-portal` (recommended, auto-suggested by deb/rpm packages)
- `xdg-desktop-portal-gtk` or desktop-specific portal backend
- PipeWire for screen sharing

## GPU Crash Recovery

Rocket.Chat Desktop includes automatic GPU crash detection:

1. **Crash Detection**: If the GPU process crashes during startup (e.g., incompatible drivers), the app detects this.
2. **Automatic Fallback**: The app relaunches with GPU acceleration disabled.
3. **Software Rendering**: The app continues with software rendering.

This is separate from display server selection and handles GPU driver issues.

## Common Scenarios

### Ubuntu 22.04 LTS (X11 Session)

Ubuntu 22.04 defaults to X11 with GNOME. The wrapper detects `XDG_SESSION_TYPE=x11` and forces X11 mode, preventing Wayland connection errors.

### Fedora (Wayland Session)

Fedora defaults to Wayland with GNOME. The wrapper detects the Wayland session and socket, allowing native Wayland operation.

### SSH Sessions

SSH sessions inherit environment variables from the graphical session but don't have Wayland socket access. The wrapper detects the missing socket and forces X11 mode.

### Virtual Machines

VMs with paravirtual graphics may not support GPU acceleration. The GPU crash recovery system handles this automatically.

## Manual Override

You can force a specific display server:

```bash
# Force X11 (bypass wrapper detection)
rocketchat-desktop --ozone-platform=x11

# Force Wayland (use with caution)
rocketchat-desktop --ozone-platform=wayland

# Disable GPU acceleration
rocketchat-desktop --disable-gpu
```

## Troubleshooting

### Check Your Display Server
```bash
echo "Session Type: $XDG_SESSION_TYPE"
echo "Wayland Display: $WAYLAND_DISPLAY"
echo "X11 Display: $DISPLAY"
```

### Check Wayland Socket
```bash
ls -la ${XDG_RUNTIME_DIR:-/run/user/$(id -u)}/${WAYLAND_DISPLAY:-wayland-0}
```

### Enable Verbose Logging
```bash
rocketchat-desktop --enable-logging --v=1
```

### Screen Sharing Not Working on Wayland

Install portal dependencies:
```bash
# Ubuntu/Debian
sudo apt install xdg-desktop-portal xdg-desktop-portal-gtk pipewire

# Fedora
sudo dnf install xdg-desktop-portal xdg-desktop-portal-gtk pipewire
```

Verify PipeWire is running:
```bash
systemctl --user status pipewire
```

## Reporting Issues

When reporting display server issues, include:

1. Session type: `echo $XDG_SESSION_TYPE`
2. Wayland display: `echo $WAYLAND_DISPLAY`
3. Socket check: `ls -la ${XDG_RUNTIME_DIR}/${WAYLAND_DISPLAY}`
4. Graphics card: `lspci | grep -i vga`
5. Distribution: `cat /etc/os-release`
6. Package type: snap/deb/rpm/AppImage
7. Full error output with `--enable-logging --v=1`
