import { setupJitsiMeetElectron } from './electron';

export const isJitsi = (): boolean =>
  'JitsiMeetJS' in window;

export const setupJitsiPage = (): void => {
  setupJitsiMeetElectron();
};
