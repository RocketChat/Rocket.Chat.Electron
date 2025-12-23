# Linux Display Server Configuration

Rocket.Chat Desktop uses native Wayland by default when available, with automatic GPU crash recovery.

## Default Behavior

| Package Type | Display Server | Notes |
|--------------|---------------|-------|
| **deb/rpm** | Native (Wayland/X11) | Uses system default |
| **Snap** | Native (Wayland/X11) | Uses system default |
| **AppImage** | Native (Wayland/X11) | Uses system default |

## Automatic GPU Crash Recovery

Rocket.Chat Desktop includes automatic GPU crash detection and recovery:

1. **Crash Detection**: If the GPU process crashes during startup (e.g., due to incompatible drivers), the app detects this automatically.

2. **Automatic Fallback**: After detecting repeated crashes, the app relaunches with GPU acceleration disabled.

3. **Recovery**: Once GPU is disabled, the app will continue to run with software rendering.

## Wayland Support

Rocket.Chat Desktop includes native Wayland support with:
- PipeWire screen capture for video calls
- Native OS screen picker integration
- Hardware acceleration

### Requirements for Wayland
- `xdg-desktop-portal` (recommended, auto-suggested by deb/rpm packages)
- `xdg-desktop-portal-gtk` or desktop-specific portal backend
- PipeWire for screen sharing
- Modern GPU drivers

## Known Issues

### Virtual Machines
VMs with paravirtual graphics (QXL, VirtualBox, VMware) may have issues with GPU acceleration.

**Symptoms:**
```text
ERROR:viz_main_impl.cc:189] Exiting GPU process due to errors during initialization
```

**Automatic Recovery:** The app automatically detects this crash and disables GPU acceleration. You should see the app restart and work normally after the crashes.

**Manual Solution:** If auto-recovery doesn't work, disable GPU:
```bash
rocketchat-desktop --disable-gpu
```

### Screen Sharing Not Working on Wayland

If screen sharing doesn't work on Wayland:

1. Install portal dependencies:
```bash
# Ubuntu/Debian
sudo apt install xdg-desktop-portal xdg-desktop-portal-gtk pipewire

# Fedora
sudo dnf install xdg-desktop-portal xdg-desktop-portal-gtk pipewire

# Arch
sudo pacman -S xdg-desktop-portal xdg-desktop-portal-gtk pipewire
```

2. Restart your session or reboot

3. Verify PipeWire is running:
```bash
systemctl --user status pipewire
```

## Manual Override

You can force a specific display server:

```bash
# Force X11
rocketchat-desktop --ozone-platform=x11

# Force Wayland
rocketchat-desktop --ozone-platform=wayland

# Disable GPU acceleration
rocketchat-desktop --disable-gpu
```

## Troubleshooting

### Check Your Display Server
```bash
echo $XDG_SESSION_TYPE
# Output: "wayland" or "x11"
```

### Check GPU Support
```bash
# Check graphics card
lspci | grep -i vga

# Check VA-API support (hardware video decode)
vainfo
```

### Enable Verbose Logging

These are standard Chromium flags that enable detailed logging output:

```bash
rocketchat-desktop --enable-logging --v=1
```

### Disable GPU Acceleration (last resort)
```bash
rocketchat-desktop --disable-gpu
```

## Best Practices

- **Real Hardware + Wayland**: Use default for best experience
- **VM**: The app will auto-detect and disable GPU after crashes
- **X11 Session**: Works automatically
- **Snap Package**: Uses native display server

## Reporting Issues

When reporting display server issues, include:

1. Display server type: `echo $XDG_SESSION_TYPE`
2. Graphics card: `lspci | grep -i vga`
3. Distribution: `cat /etc/os-release`
4. Package type: snap/deb/rpm/AppImage
5. Full error output with `--enable-logging --v=1`
