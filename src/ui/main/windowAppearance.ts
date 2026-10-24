import type { BrowserWindowConstructorOptions } from 'electron';

export const getRootWindowAppearanceOptions = ({
  platform,
  isTransparentWindowEnabled,
  shouldUseDarkColors,
}: {
  platform: NodeJS.Platform;
  isTransparentWindowEnabled: boolean;
  shouldUseDarkColors: boolean;
}): BrowserWindowConstructorOptions => {
  if (platform === 'darwin') {
    if (isTransparentWindowEnabled) {
      return {
        transparent: true,
        backgroundColor: '#00000000',
        vibrancy: 'sidebar',
        visualEffectState: 'active',
      };
    }

    return {
      backgroundColor: shouldUseDarkColors ? '#2f343d' : '#ffffff',
    };
  }

  if (platform === 'linux') {
    // Linux client chrome is a plain rectangle under most WMs. Transparent +
    // CSS radius paints soft outer corners. Windows gets DWM rounding.
    return {
      transparent: true,
      backgroundColor: '#00000000',
      hasShadow: true,
    };
  }

  return {};
};
