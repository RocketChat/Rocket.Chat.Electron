import { useEffect, useState } from 'react';

import { isDarwin, readInitialTransparency } from './appearance';

type WindowWithBridge = {
  RocketChatDesktop?: {
    logViewer?: {
      on: (
        eventChannel: string,
        listener: (...args: unknown[]) => void
      ) => () => void;
    };
  };
  require?: (module: string) => {
    ipcRenderer?: {
      on: (
        channel: string,
        listener: (event: unknown, ...args: unknown[]) => void
      ) => void;
      off: (
        channel: string,
        listener: (event: unknown, ...args: unknown[]) => void
      ) => void;
    };
  };
};

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
    const handleChange = (_event: unknown, ...args: unknown[]): void => {
      setIsEnabled(Boolean(args[0]));
    };

    if (typeof window === 'undefined') {
      return undefined;
    }
    const win = window as unknown as WindowWithBridge;

    const bridge = win.RocketChatDesktop?.logViewer;
    if (bridge) {
      return bridge.on(channel, (enabled: unknown) => {
        handleChange(null, enabled);
      });
    }

    const ipcRenderer = win.require?.('electron')?.ipcRenderer;
    if (ipcRenderer) {
      ipcRenderer.on(channel, handleChange);
      return () => {
        ipcRenderer.off(channel, handleChange);
      };
    }

    return undefined;
  }, [channel]);

  // Vibrancy only reads as a material on macOS; elsewhere the window is opaque
  // regardless of the setting, matching how the main window treats it.
  return isDarwin && isEnabled;
};
