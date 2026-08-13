import { ipcRenderer } from 'electron';
import { useEffect, useState } from 'react';

import { isDarwin, readInitialTransparency } from './appearance';

/**
 * Whether the window should let the desktop show through.
 *
 * These windows are always created transparent with a vibrancy material on
 * macOS — `transparent` cannot be toggled after creation — so honouring the
 * setting is the renderer's job: it either paints an opaque surface over the
 * material or gets out of the way. That is what lets the setting apply without
 * reopening the window.
 *
 * Seeded from the page query so the first paint already matches, then kept in
 * step with the setting by the main process over `channel`.
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
