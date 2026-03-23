import { systemPreferences } from 'electron';

export const checkScreenRecordingPermission = async (): Promise<boolean> => {
  if (process.platform === 'darwin') {
    const permission = systemPreferences.getMediaAccessStatus('screen');
    return permission === 'granted';
  }
  return true;
};
