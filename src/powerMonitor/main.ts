import { powerMonitor, webContents } from 'electron';

export const setupFrameRateThrottling = (): void => {
  const originalBackgroundThrottling = new Map<number, boolean>();
  const originalFrameRates = new Map<number, number>();

  const throttle = () => {
    webContents.getAllWebContents().forEach((wc) => {
      try {
        if (wc.isDestroyed()) return;

        if ((wc as any).getType?.() === 'offscreen') {
          if (!originalFrameRates.has(wc.id)) {
            const currentFps = (wc as any).getFrameRate?.() ?? 60;
            originalFrameRates.set(wc.id, currentFps);
          }
          wc.setFrameRate(10);
        }

        if (!originalBackgroundThrottling.has(wc.id)) {
          const original =
            (wc as any).getBackgroundThrottling?.() ??
            (wc as any).getWebPreferences?.()?.backgroundThrottling ??
            true;
          originalBackgroundThrottling.set(wc.id, original);
        }
        wc.setBackgroundThrottling(true);
      } catch (error) {
        // ignore destroyed webcontents
      }
    });
  };

  const restore = () => {
    webContents.getAllWebContents().forEach((wc) => {
      try {
        if (wc.isDestroyed()) return;

        if ((wc as any).getType?.() === 'offscreen') {
          const originalFps = originalFrameRates.get(wc.id);
          if (originalFps !== undefined) {
            wc.setFrameRate(originalFps);
            originalFrameRates.delete(wc.id);
          }
        }

        const originalThrottling = originalBackgroundThrottling.get(wc.id);
        if (originalThrottling !== undefined) {
          wc.setBackgroundThrottling(originalThrottling);
          originalBackgroundThrottling.delete(wc.id);
        }
      } catch (error) {
        // ignore destroyed webcontents
      }
    });
  };

  powerMonitor.on('suspend', throttle);
  powerMonitor.on('lock-screen', throttle);

  powerMonitor.on('resume', restore);
  powerMonitor.on('unlock-screen', restore);
};
