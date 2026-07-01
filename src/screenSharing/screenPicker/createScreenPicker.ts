import fs from 'fs';

import { InternalPickerProvider } from './providers/InternalPickerProvider';
import { PortalPickerProvider } from './providers/PortalPickerProvider';
import type { ScreenPickerProvider, ScreenPickerType } from './types';

// Detect a Wayland session without trusting XDG_SESSION_TYPE alone.
// Sandboxes (Flatpak/Snap) strip XDG_SESSION_TYPE / XDG_CURRENT_DESKTOP, so we
// fall back to confirming the Wayland socket exists on disk (same pattern used
// by src/app/main/app.ts for the ozone platform decision).
function isWaylandSession(): boolean {
  if (process.env.XDG_SESSION_TYPE?.trim() === 'wayland') {
    return true;
  }

  const waylandDisplay = process.env.WAYLAND_DISPLAY?.trim();
  if (!waylandDisplay) {
    return false;
  }

  try {
    const runtimeDir =
      process.env.XDG_RUNTIME_DIR || `/run/user/${process.getuid?.() ?? 1000}`;
    const socketPath = `${runtimeDir}/${waylandDisplay}`;
    return fs.statSync(socketPath).isSocket();
  } catch {
    return false;
  }
}

// The Linux default is 'portal', NOT 'internal'. Rationale:
// - The app forces --enable-features=WebRTCPipeWireCapturer on ALL Linux, so on
//   Wayland every desktopCapturer.getSources() call routes through the XDG portal
//   and pops the system picker dialog. The internal picker warms a source cache at
//   launch, which triggers that dialog on every startup (issue #3308).
// - Sandboxes (Flatpak/Snap) strip XDG_SESSION_TYPE / XDG_CURRENT_DESKTOP, so
//   env-based session sniffing cannot reliably tell Wayland from X11. Defaulting to
//   'internal' on ambiguous env is exactly what pops the dialog on real Wayland.
// - Worst case of defaulting to 'portal': the picker appears on user demand (correct
//   behaviour) instead of unexpectedly at launch. So 'internal' is only chosen when
//   we can positively confirm a silent-capable environment (pure X11 + no portal), or
//   via the ROCKETCHAT_INTERNAL_SCREEN_PICKER escape hatch.
export function detectPickerType(): ScreenPickerType {
  if (process.platform === 'linux') {
    // 1. Escape hatch — force the internal picker regardless of environment.
    if (process.env.ROCKETCHAT_INTERNAL_SCREEN_PICKER === '1') {
      return 'internal';
    }

    // 2. Wayland → portal (getSources cannot enumerate silently there).
    if (isWaylandSession()) {
      return 'portal';
    }

    // 3. Pure X11 → silent capture works, internal picker is fine.
    //    Only chosen when the session type is positively X11; ambiguous env
    //    (sandbox with XDG_SESSION_TYPE stripped) falls through to portal.
    if (process.env.XDG_SESSION_TYPE?.trim() === 'x11') {
      return 'internal';
    }

    // 4. Unknown / ambiguous / sandbox with stripped env → portal (the #3308 fix).
    return 'portal';
  }

  // Non-Linux (darwin/win32): keep the internal picker.
  // Future: Add macOS native picker detection here
  // if (process.platform === 'darwin' && hasMacOSNativePicker()) {
  //   return 'native-macos';
  // }

  return 'internal';
}

let cachedProvider: ScreenPickerProvider | null = null;

export function createScreenPicker(): ScreenPickerProvider {
  if (cachedProvider) return cachedProvider;

  const type = detectPickerType();

  switch (type) {
    case 'portal':
      cachedProvider = new PortalPickerProvider();
      break;
    case 'internal':
    default:
      cachedProvider = new InternalPickerProvider();
  }

  console.log(`Screen picker: using ${cachedProvider.type} provider`);
  return cachedProvider;
}

export function getScreenPicker(): ScreenPickerProvider {
  if (!cachedProvider) {
    throw new Error(
      'Screen picker not initialized. Call createScreenPicker() first.'
    );
  }
  return cachedProvider;
}

export function resetScreenPicker(): void {
  cachedProvider?.cleanup();
  cachedProvider = null;
}
