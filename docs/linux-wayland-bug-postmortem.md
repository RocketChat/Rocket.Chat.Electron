# Linux Wayland/X11 Display Server Bug - Post-Mortem Analysis

## Issue Reference

- **GitHub Issue**: [#3154](https://github.com/RocketChat/Rocket.Chat.Electron/issues/3154)
- **Related PR**: [#3171](https://github.com/RocketChat/Rocket.Chat.Electron/pull/3171)
- **Date**: January 2026
- **Severity**: Critical (application crash/segfault)

## Executive Summary

Rocket.Chat Desktop crashes with SEGFAULT when environment variables suggest a Wayland session but no valid Wayland compositor is available. The initial fix attempt using `app.commandLine.appendSwitch()` was **ineffective** because Chromium's display platform initialization occurs before any Electron JavaScript code executes. The solution requires a **shell wrapper script** that detects the display server situation and passes appropriate command-line flags before the binary starts.

---

## The Solution That Actually Worked

### Problem

Rocket.Chat Desktop crashes with SEGFAULT when environment variables suggest a Wayland session but no valid Wayland compositor is available, because Chromium's display platform initialization occurs before any Electron JavaScript code executes.

### Solution

Implement a shell wrapper script (`build/linux/wrapper.sh`) that detects the display server situation before the binary starts. The wrapper checks XDG_SESSION_TYPE, WAYLAND_DISPLAY, and socket existence, then passes `--ozone-platform=x11` when needed.

### Result

All test scenarios pass on Ubuntu 22.04 and Fedora 42 (physical and VM). The wrapper correctly:

- Allows native Wayland when valid socket exists
- Forces X11 in all failure scenarios (fake socket, missing display, X11 session, etc.)
- Prevents all previously occurring segfaults

### PR

[#3171](https://github.com/RocketChat/Rocket.Chat.Electron/pull/3171)

---

## Problem Description

### Symptoms

Users reported segmentation faults when launching Rocket.Chat Desktop on:

- Ubuntu 22.04 LTS with X11 sessions
- SSH sessions into machines with graphical desktops
- Systems where `XDG_SESSION_TYPE=wayland` but no Wayland compositor is running

### Error Output

```
ERROR:ui/ozone/platform/wayland/host/wayland_connection.cc:202
Failed to connect to Wayland display: No such file or directory (2)

ERROR:ui/ozone/platform/wayland/ozone_platform_wayland.cc:282
Failed to initialize Wayland platform

ERROR:ui/aura/env.cc:257
The platform failed to initialize. Exiting.

Segmentation fault (core dumped)
```

### Root Cause

Chromium's Ozone platform layer auto-detects the display server based on environment variables. When `WAYLAND_DISPLAY` is set (even to a non-existent socket), Chromium attempts to connect to Wayland. If the connection fails, Chromium crashes instead of falling back to X11.

---

## Test Environments

### Hardware Tested

| Environment        | OS                 | GPU                                | Display Server  |
| ------------------ | ------------------ | ---------------------------------- | --------------- |
| Physical Machine 1 | Fedora 42          | Intel UHD 630 + NVIDIA GTX 1660 Ti | Wayland (GNOME) |
| Physical Machine 2 | Ubuntu 22.04.2 LTS | Intel UHD 630 + NVIDIA GTX 1660 Ti | X11 (GNOME)     |
| Virtual Machine    | Fedora 42          | Virtual (no GPU)                   | Wayland (GNOME) |
| Virtual Machine    | Ubuntu 22.04       | Virtual (no GPU)                   | X11 (GNOME)     |

### Package Formats Tested

- Snap (4.11.0 from store)
- AppImage (4.11.0 release)
- DEB (built from source with fix)

---

## Test Scenarios

| #   | Scenario                 | Environment Variables                                      | Simulates                                 |
| --- | ------------------------ | ---------------------------------------------------------- | ----------------------------------------- |
| 1   | Real Wayland session     | `XDG_SESSION_TYPE=wayland`, `WAYLAND_DISPLAY=wayland-0`    | Normal Wayland desktop                    |
| 2   | Fake Wayland socket      | `XDG_SESSION_TYPE=wayland`, `WAYLAND_DISPLAY=wayland-fake` | **Bug trigger** - vars set, no compositor |
| 3   | Wayland type, no display | `XDG_SESSION_TYPE=wayland`, no `WAYLAND_DISPLAY`           | Misconfigured session                     |
| 4   | X11 session              | `XDG_SESSION_TYPE=x11`, `DISPLAY=:0`                       | Normal X11 desktop                        |
| 5   | No session type          | Only `DISPLAY=:0`                                          | Minimal/legacy config                     |
| 6   | TTY session              | `XDG_SESSION_TYPE=tty`                                     | Console session                           |

---

## Test Results

### Fedora 42 Physical (GTX 1660 Ti) - Baseline 4.11.0

| Scenario                 | Result       | Notes                                           |
| ------------------------ | ------------ | ----------------------------------------------- |
| Real Wayland session     | **PASS**     | Window visible, native Wayland, GPU accelerated |
| Fake Wayland socket      | **SEGFAULT** | Exit code 139, core dumped                      |
| Wayland type, no display | **PASS**     | Falls back correctly                            |
| X11 via XWayland         | **PASS**     | Window visible                                  |
| No session type          | **PASS**     | Window visible                                  |

### Fedora 42 VM (No GPU) - Baseline 4.11.0

| Scenario                 | Result       | Notes                               |
| ------------------------ | ------------ | ----------------------------------- |
| Real Wayland session     | **PASS**     | Falls back to X11 (GPU unavailable) |
| Fake Wayland socket      | **SEGFAULT** | Exit code 139                       |
| Wayland type, no display | **PASS**     | Falls back to X11                   |
| X11 via XWayland         | **PASS**     | Works                               |
| No session type          | **PASS**     | Works                               |

### Ubuntu 22.04 Physical (GTX 1660 Ti) - Snap 4.11.0 Baseline

| Scenario                 | Result       | Notes          |
| ------------------------ | ------------ | -------------- |
| X11 Session              | **PASS**     | Window visible |
| Fake Wayland socket      | **SEGFAULT** | Exit code 139  |
| Wayland type, no display | **SEGFAULT** | Exit code 139  |
| No session type          | **PASS**     | Window visible |
| TTY type                 | **PASS**     | Window visible |

### Ubuntu 22.04 Physical - DEB with Code Fix (`app.commandLine.appendSwitch`)

| Scenario                 | Result       | Notes           |
| ------------------------ | ------------ | --------------- |
| X11 Session              | **PASS**     | -               |
| Fake Wayland socket      | **SEGFAULT** | Fix ineffective |
| Wayland type, no display | **SEGFAULT** | Fix ineffective |
| No session type          | **PASS**     | -               |
| TTY type                 | **PASS**     | -               |

### Ubuntu 22.04 Physical - DEB with Wrapper Script Fix

| Scenario                 | Result   | Notes              |
| ------------------------ | -------- | ------------------ |
| X11 Session              | **PASS** | Window visible     |
| Fake Wayland socket      | **PASS** | Wrapper forces X11 |
| Wayland type, no display | **PASS** | Wrapper forces X11 |
| No session type          | **PASS** | Window visible     |
| TTY type                 | **PASS** | Window visible     |

### Fedora 42 Physical - All Packages with Wrapper Script Fix

| Scenario             | RPM      | AppImage | tar.gz   |
| -------------------- | -------- | -------- | -------- |
| Real Wayland session | **PASS** | **PASS** | **PASS** |
| Fake Wayland socket  | **PASS** | **PASS** | **PASS** |

**Key validation**: Real Wayland session shows "Using Wayland platform" in logs, confirming wrapper correctly allows native Wayland when socket exists.

### Fedora 42 VM (No GPU) - RPM with Wrapper Script Fix

| Scenario             | Result   | Notes                                        |
| -------------------- | -------- | -------------------------------------------- |
| Real Wayland session | **PASS** | Detects no GPU, gracefully falls back to X11 |
| Fake Wayland socket  | **PASS** | Wrapper forces X11                           |

---

## Technical Analysis

### Why `app.commandLine.appendSwitch()` Doesn't Work

```
Process Startup Timeline:

[Binary Start]
     │
     ▼
[Chromium Native Initialization]
     │
     ├── Read environment variables
     ├── WAYLAND_DISPLAY="wayland-0" found
     ├── Select Ozone Wayland platform
     ├── wl_display_connect("wayland-0")
     ├── Connection fails (socket doesn't exist)
     └── SEGFAULT ◄─── Crash happens HERE
     │
     ✗ (Never reached)
     │
[V8 JavaScript Engine Init]
     │
[Electron main.ts execution]
     │
[app.commandLine.appendSwitch()]  ◄─── Too late!
```

The JavaScript-level fix cannot work because:

1. Chromium must initialize before V8 (JavaScript engine) can run
2. Ozone platform selection happens during Chromium initialization
3. The crash occurs before any Electron/Node.js code executes

### Why Wrapper Script Works

```
Process Startup Timeline with Wrapper:

[Wrapper Script Start]
     │
     ├── Check XDG_SESSION_TYPE
     ├── Check WAYLAND_DISPLAY
     ├── Check if socket exists
     ├── Decision: Force X11
     └── exec binary --ozone-platform=x11
          │
          ▼
[Binary Start with --ozone-platform=x11]
     │
     ▼
[Chromium Native Initialization]
     │
     ├── Read command-line arguments
     ├── --ozone-platform=x11 found
     ├── Select Ozone X11 platform (ignores WAYLAND_DISPLAY)
     ├── Connect to X11 display
     └── SUCCESS
     │
     ▼
[Application runs normally]
```

Command-line flags take precedence over environment-based auto-detection.

---

## The Fix

### Wrapper Script (`/opt/Rocket.Chat/rocketchat-desktop`)

```bash
#!/bin/bash
EXTRA_ARGS=""

if [ "$XDG_SESSION_TYPE" != "wayland" ]; then
    EXTRA_ARGS="--ozone-platform=x11"
elif [ -z "$WAYLAND_DISPLAY" ]; then
    EXTRA_ARGS="--ozone-platform=x11"
else
    SOCKET="${XDG_RUNTIME_DIR:-/run/user/$(id -u)}/$WAYLAND_DISPLAY"
    [ ! -S "$SOCKET" ] && EXTRA_ARGS="--ozone-platform=x11"
fi

exec /opt/Rocket.Chat/rocketchat-desktop.bin $EXTRA_ARGS "$@"
```

### Detection Logic

| XDG_SESSION_TYPE | WAYLAND_DISPLAY | Socket Exists | Action               |
| ---------------- | --------------- | ------------- | -------------------- |
| wayland          | wayland-0       | Yes           | Use Wayland (native) |
| wayland          | wayland-0       | No            | Force X11            |
| wayland          | (empty)         | N/A           | Force X11            |
| x11              | (any)           | (any)         | Force X11            |
| tty              | (any)           | (any)         | Force X11            |
| (empty)          | (any)           | (any)         | Force X11            |

### Implementation by Package Type

| Package            | Fix Method                  | Notes                                                |
| ------------------ | --------------------------- | ---------------------------------------------------- |
| **deb/rpm/tar.gz** | Wrapper script              | Binary renamed, wrapper installed via `afterPack.js` |
| **Snap**           | `allowNativeWayland: false` | electron-builder forces X11 in Snap launcher         |
| **Flatpak**        | electron-builder config     | Uses `executableArgs` for X11 fallback               |
| **AppImage**       | electron-builder config     | Uses internal launcher with X11 fallback             |

For deb/rpm/tar.gz, the implementation in `build/afterPack.js`:

1. **Rename binary**: `rocketchat-desktop` → `rocketchat-desktop.bin`
2. **Install wrapper**: Copy `build/linux/wrapper.sh` as `rocketchat-desktop`
3. **Set permissions**: `chmod 755` on wrapper

---

## Affected Scenarios

### When This Bug Occurs

1. **SSH Sessions**: User SSHs into a machine with Wayland desktop. Environment variables are inherited but SSH has no Wayland access.

2. **VNC/Remote Desktop**: Remote access to Wayland systems where environment says Wayland but remote protocol uses X11.

3. **X11 Fallback Sessions**: User selected X11 session at login but `XDG_SESSION_TYPE=wayland` persists from previous session.

4. **Crashed Compositor**: Wayland compositor crashed but environment variables remain.

5. **Container/Sandbox**: Application running in container inherits host's Wayland vars but has no socket access.

---

## Validation Commands

### Check Display Server

```bash
echo "Session Type: $XDG_SESSION_TYPE"
echo "Wayland Display: $WAYLAND_DISPLAY"
echo "X11 Display: $DISPLAY"
```

### Check Wayland Socket

```bash
ls -la ${XDG_RUNTIME_DIR:-/run/user/$(id -u)}/${WAYLAND_DISPLAY:-wayland-0}
```

### Test with Forced X11

```bash
rocketchat-desktop --ozone-platform=x11
```

### Test Wrapper Detection

```bash
# Should show what the wrapper decides
bash -x /opt/Rocket.Chat/rocketchat-desktop --help 2>&1 | grep ozone
```

---

## Timeline

| Date       | Event                                                         |
| ---------- | ------------------------------------------------------------- |
| 2026-01-07 | Comprehensive testing reveals code fix is ineffective         |
| 2026-01-07 | Wrapper script solution validated on Fedora 42 + Ubuntu 22.04 |
| 2026-01-07 | Fix implemented in build process                              |

---

## Lessons Learned

1. **Electron/Chromium initialization order matters**: JavaScript code cannot affect Chromium's native initialization.

2. **Environment-based bugs require environment-level fixes**: When the bug is triggered by environment variables before app code runs, the fix must also run before app code.

3. **Test on real hardware**: VM-only testing missed GPU-related code paths. Physical hardware testing with real GPUs caught additional edge cases.

4. **Test multiple distributions**: Fedora and Ubuntu behaved slightly differently (Ubuntu crashed on more scenarios).

5. **Snap, DEB, AppImage behave differently**: Each package format has different environment isolation. Test all formats.

---

## References

- Chromium Ozone Platform: https://chromium.googlesource.com/chromium/src/+/HEAD/docs/ozone_overview.md
- Electron Command Line Switches: https://www.electronjs.org/docs/latest/api/command-line-switches
- Wayland Protocol: https://wayland.freedesktop.org/
- XDG Base Directory Specification: https://specifications.freedesktop.org/basedir-spec/basedir-spec-latest.html

---

_Post-mortem completed: 2026-01-08_
_Validated on: Fedora 42 (physical + VM), Ubuntu 22.04 LTS (physical)_
_Packages validated: DEB, AppImage, tar.gz, Snap, RPM_
