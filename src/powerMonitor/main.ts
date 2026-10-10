import { powerMonitor, webContents } from 'electron';

export const setupPowerMonitor = (): void => {
  const throttleFrameRates = (fps: number) => {
    webContents.getAllWebContents().forEach((wc) => {
      try {
        wc.setFrameRate(fps);
      } catch (error) {
        // ignore destroyed webcontents
      }
    });
  };

  powerMonitor.on('suspend', () => throttleFrameRates(10));
  powerMonitor.on('lock-screen', () => throttleFrameRates(10));
  
  powerMonitor.on('resume', () => throttleFrameRates(60));
  powerMonitor.on('unlock-screen', () => throttleFrameRates(60));
};
