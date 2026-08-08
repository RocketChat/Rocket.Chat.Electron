import { ipcRenderer } from 'electron';
import { useEffect, useState } from 'react';

import { isDarwin, readInitialTransparency } from './appearance';

/**
 * Whether the window should let the desktop show through.
 *
 * The window itself is always created transparent with a vibrancy material on
 * macOS — `transparent` cannot be toggled after creation — so honouring the
 * setting is the renderer's job: it either paints an opaque surface over the
 * material or gets out of the way. That is what lets the setting apply without
 * reopening this window.
 *
 * Seeded from the page query so the first paint already matches, then kept in
 * step with the setting by the main process.
 */
export const useTransparency = (): boolean => {
  const [isEnabled, setIsEnabled] = useState(readInitialTransparency);

  useEffect(() => {
    const handleChange = (_event: unknown, enabled: boolean): void => {
      setIsEnabled(Boolean(enabled));
    };

    ipcRenderer.on('log-viewer-window/transparency-changed', handleChange);
    return () => {
      ipcRenderer.off('log-viewer-window/transparency-changed', handleChange);
    };
  }, []);

  // Vibrancy only reads as a material on macOS; elsewhere the window is opaque
  // regardless of the setting, matching how the main window treats it.
  return isDarwin && isEnabled;
};
