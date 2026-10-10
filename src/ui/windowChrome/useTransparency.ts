import { useEffect, useState } from 'react';

import { isDarwin, readInitialTransparency } from './appearance';
import type { BridgeSubscribe } from './logViewerBridge';
import { getLogViewerBridge } from './logViewerBridge';

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
/**
 * Tracks the transparency setting pushed by the main process over `channel`.
 *
 * The hook never imports `electron` so the sandboxed Log Viewer bundle can
 * load it. Callers in non-sandboxed windows pass their legacy `subscribe`;
 * otherwise the `RocketChatDesktop.logViewer` bridge is used when present.
 */
export const useTransparency = (
  channel: string,
  subscribe?: BridgeSubscribe
): boolean => {
  const [isEnabled, setIsEnabled] = useState(readInitialTransparency);

  useEffect(() => {
    const resolveSubscribe = (): BridgeSubscribe | undefined => {
      if (subscribe) {
        return subscribe;
      }
      const bridge = getLogViewerBridge();
      if (bridge) {
        return (eventChannel, listener) =>
          bridge.on(eventChannel, (enabled: unknown) => {
            listener(Boolean(enabled));
          });
      }
      return undefined;
    };

    const activeSubscribe = resolveSubscribe();
    if (!activeSubscribe) {
      return;
    }

    return activeSubscribe(channel, setIsEnabled);
  }, [channel, subscribe]);

  // Vibrancy only reads as a material on macOS; elsewhere the window is opaque
  // regardless of the setting, matching how the main window treats it.
  return isDarwin && isEnabled;
};
