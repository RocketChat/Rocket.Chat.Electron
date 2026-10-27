import { ipcRenderer } from 'electron';
import { useEffect, useState } from 'react';

import { isDarwin, readInitialTransparency } from './appearance';

/**
 * Whether the window should let the desktop show through.
 *
 * Seeded from the page query so the first paint matches native appearance.
 * On macOS the main process recreates open windows when the setting changes,
 * because native transparency cannot be changed after construction.
 */
export const useTransparency = (channel: string): boolean => {
  const [isEnabled, setIsEnabled] = useState(readInitialTransparency);

  useEffect(() => {
    const handleChange = (_event: unknown, enabled: boolean): void => {
      setIsEnabled(Boolean(enabled));
    };

    ipcRenderer.on(channel, handleChange);
    return () => {
      ipcRenderer.off(channel, handleChange);
    };
  }, [channel]);

  // Vibrancy only reads as a material on macOS; elsewhere the window is opaque
  // regardless of the setting, matching how the main window treats it.
  return isDarwin && isEnabled;
};
