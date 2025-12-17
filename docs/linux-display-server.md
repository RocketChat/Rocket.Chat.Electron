# Linux Display Server Configuration

Rocket.Chat Desktop automatically detects and uses the best display server (Wayland or X11) for your system. If the app detects GPU issues during startup, it automatically switches to a compatible mode.

## Default Behavior

| Package Type | Display Server | Notes |
|--------------|---------------|-------|
| **deb/rpm** | Auto-detect | Uses Wayland if available, falls back to X11 |
| **Snap** | Auto-detect | Uses Wayland if available, falls back to X11 |
| **AppImage** | Auto-detect | Uses Wayland if available, falls back to X11 |

## Automatic GPU Crash Recovery

Rocket.Chat Desktop includes automatic GPU crash detection and recovery:

1. **Crash Detection**: If the GPU process crashes during startup (e.g., due to incompatible drivers), the app detects this automatically.

2. **Automatic Fallback**: After detecting crashes, the app saves a fallback mode and relaunches with X11 forced.

3. **Persistent Setting**: The fallback mode is remembered across restarts, preventing repeated crashes.

4. **User Control**: You can view and reset the fallback mode in Settings > General > Display Server Mode.

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
VMs with paravirtual graphics (QXL, VirtualBox, VMware) may have issues with Wayland GPU acceleration.

**Symptoms:**
```text
ERROR:viz_main_impl.cc:189] Exiting GPU process due to errors during initialization
```

**Automatic Recovery:** The app automatically detects this crash and switches to X11 mode. You should see the app restart and work normally after the first crash.

**Manual Solution:** If auto-recovery doesn't work, force X11 mode:
```bash
rocketchat-desktop --ozone-platform=x11
```

**Settings Option:** Go to Settings > General > Display Server Mode and select "Force X11".

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

# Force Wayland (if system supports it)
rocketchat-desktop --ozone-platform=wayland
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

## Resetting Display Server Mode

If the app auto-switched to X11 and you want to try Wayland again (e.g., after updating GPU drivers):

1. Open the app (it will run in X11 mode)
2. Go to Settings > General
3. Find "Display Server Mode"
4. Select "Auto-detect (Wayland/X11)"
5. The app will restart and attempt Wayland

If the GPU crashes again, the app will automatically switch back to X11.

## Best Practices

- **Real Hardware + Wayland**: Use default (auto-detection) for best experience
- **VM + Wayland**: The app will auto-detect and switch to X11 after first crash
- **X11 Session**: No configuration needed, works automatically
- **Snap Package**: Uses auto-detection like other package types

## Reporting Issues

When reporting display server issues, include:

1. Display server type: `echo $XDG_SESSION_TYPE`
2. Graphics card: `lspci | grep -i vga`
3. Distribution: `cat /etc/os-release`
4. Package type: snap/deb/rpm/AppImage
5. Full error output with `--enable-logging --v=1`
