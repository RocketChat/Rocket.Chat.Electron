import { powerMonitor, webContents } from 'electron';

export const setupFrameRateThrottling = (): void => {
  const originalBackgroundThrottling = new Map<number, boolean>();

  const throttle = () => {
    webContents.getAllWebContents().forEach((wc) => {
      try {
        if (wc.isDestroyed()) return;

        wc.setFrameRate(10);

        if (!originalBackgroundThrottling.has(wc.id)) {
          const prefs = (wc as any).getWebPreferences?.();
          originalBackgroundThrottling.set(
            wc.id,
            prefs?.backgroundThrottling ?? true
          );
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

        wc.setFrameRate(60);

        const original = originalBackgroundThrottling.get(wc.id);
        if (original !== undefined) {
          wc.setBackgroundThrottling(original);
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
