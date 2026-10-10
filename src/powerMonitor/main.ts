import { powerMonitor, webContents } from 'electron';

export const setupFrameRateThrottling = (): void => {
  const throttleFrameRates = (throttled: boolean) => {
    webContents.getAllWebContents().forEach((wc) => {
      try {
        wc.setBackgroundThrottling(throttled);
      } catch (error) {
        // ignore destroyed webcontents
      }
    });
  };

  powerMonitor.on('suspend', () => throttleFrameRates(true));
  powerMonitor.on('lock-screen', () => throttleFrameRates(true));
  
  powerMonitor.on('resume', () => throttleFrameRates(false));
  powerMonitor.on('unlock-screen', () => throttleFrameRates(false));
};
