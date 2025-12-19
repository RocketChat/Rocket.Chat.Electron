import { InternalPickerProvider } from './providers/InternalPickerProvider';
import { PortalPickerProvider } from './providers/PortalPickerProvider';
import type { ScreenPickerProvider, ScreenPickerType } from './types';

function detectPickerType(): ScreenPickerType {
  if (process.platform === 'linux') {
    const sessionType = process.env.XDG_SESSION_TYPE;
    const desktop = process.env.XDG_CURRENT_DESKTOP || '';

    const isWayland = sessionType === 'wayland';
    const hasPortal =
      /GNOME|KDE|XFCE|Cinnamon|MATE|Pantheon|Budgie|Unity/i.test(desktop);

    if (isWayland || hasPortal) {
      return 'portal';
    }
  }

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
