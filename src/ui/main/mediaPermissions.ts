import type { BrowserWindow } from 'electron';
import { shell, systemPreferences } from 'electron';

import { askForMediaPermissionSettings } from './dialogs';

export type MediaPermissionActionType =
  | 'initiateCall'
  | 'answerCall'
  | 'recordMessage';

const computeMediaNeeds = (
  mediaTypes: ReadonlyArray<'audio' | 'video'>
): { needsAudio: boolean; needsVideo: boolean } => {
  return {
    needsAudio: mediaTypes.includes('audio'),
    needsVideo: mediaTypes.includes('video'),
  };
};

const readMediaStatusesAndInitializeAllowed = async (
  needsAudio: boolean,
  needsVideo: boolean,
  handleNotDetermined: boolean
): Promise<{
  micStatus: string | undefined;
  camStatus: string | undefined;
  microphoneAllowed: boolean;
  cameraAllowed: boolean;
}> => {
  let micStatus: string | undefined;
  let camStatus: string | undefined;

  if (needsAudio) {
    micStatus = systemPreferences.getMediaAccessStatus('microphone');
  }
  if (needsVideo) {
    camStatus = systemPreferences.getMediaAccessStatus('camera');
  }

  let microphoneAllowed = !needsAudio || micStatus === 'granted';
  let cameraAllowed = !needsVideo || camStatus === 'granted';

  if (handleNotDetermined) {
    if (micStatus === 'not-determined') {
      microphoneAllowed =
        await systemPreferences.askForMediaAccess('microphone');
    }
    if (camStatus === 'not-determined') {
      cameraAllowed = await systemPreferences.askForMediaAccess('camera');
    }
  }

  return { micStatus, camStatus, microphoneAllowed, cameraAllowed };
};

const handleDeniedPermissions = async (
  parentWindow: BrowserWindow | null,
  micStatus: string | undefined,
  camStatus: string | undefined,
  _microphoneAllowed: boolean,
  _cameraAllowed: boolean,
  openers: Record<'microphone' | 'camera' | 'both', string>,
  isDeniedStatus: (status: string | undefined) => boolean
): Promise<void> => {
  const micDenied = isDeniedStatus(micStatus);
  const camDenied = isDeniedStatus(camStatus);

  if (micDenied || camDenied) {
    if (parentWindow && !parentWindow.isDestroyed()) {
      let permissionType: 'microphone' | 'camera' | 'both';
      if (micDenied && camDenied) {
        permissionType = 'both';
      } else if (micDenied) {
        permissionType = 'microphone';
      } else {
        permissionType = 'camera';
      }

      try {
        const openSettings = await askForMediaPermissionSettings(
          permissionType,
          parentWindow
        );
        if (openSettings) {
          shell.openExternal(openers[permissionType]);
        }
      } catch (error) {
        console.warn('Failed to open media permission settings dialog:', error);
      }
    }
  }
};

export const handleMediaPermissionRequest = async (
  mediaTypes: ReadonlyArray<'audio' | 'video'>,
  parentWindow: BrowserWindow | null,
  // eslint-disable-next-line @typescript-eslint/naming-convention
  _actionType: MediaPermissionActionType,
  callback: (allowed: boolean) => void
): Promise<void> => {
  if (process.platform === 'darwin') {
    const { needsAudio, needsVideo } = computeMediaNeeds(mediaTypes);

    const { micStatus, camStatus, microphoneAllowed, cameraAllowed } =
      await readMediaStatusesAndInitializeAllowed(needsAudio, needsVideo, true);

    const openers: Record<'microphone' | 'camera' | 'both', string> = {
      microphone:
        'x-apple.systempreferences:com.apple.preference.security?Privacy_Microphone',
      camera:
        'x-apple.systempreferences:com.apple.preference.security?Privacy_Camera',
      both: 'x-apple.systempreferences:com.apple.preference.security?Privacy_Microphone',
    };

    const isDeniedStatus = (status: string | undefined): boolean =>
      status === 'denied' || status === 'restricted';

    await handleDeniedPermissions(
      parentWindow,
      micStatus,
      camStatus,
      microphoneAllowed,
      cameraAllowed,
      openers,
      isDeniedStatus
    );

    callback(microphoneAllowed && cameraAllowed);
    return;
  }

  if (process.platform === 'win32') {
    const { needsAudio, needsVideo } = computeMediaNeeds(mediaTypes);

    const { micStatus, camStatus, microphoneAllowed, cameraAllowed } =
      await readMediaStatusesAndInitializeAllowed(
        needsAudio,
        needsVideo,
        false
      );

    const openers: Record<'microphone' | 'camera' | 'both', string> = {
      microphone: 'ms-settings:privacy-microphone',
      camera: 'ms-settings:privacy-webcam',
      both: 'ms-settings:privacy-microphone',
    };

    const isDeniedStatus = (status: string | undefined): boolean =>
      status === 'denied';

    await handleDeniedPermissions(
      parentWindow,
      micStatus,
      camStatus,
      microphoneAllowed,
      cameraAllowed,
      openers,
      isDeniedStatus
    );

    callback(microphoneAllowed && cameraAllowed);
    return;
  }

  if (process.platform === 'linux') {
    // Linux: Electron's systemPreferences APIs are not available on Linux.
    // Permission handling is delegated to:
    // 1. Browser permission prompts (Chromium will show native permission dialogs)
    // 2. System-level audio configuration (PulseAudio, PipeWire, ALSA)
    // We allow the request and let the browser and OS handle the permission flow.
    callback(true);
    return;
  }

  // Other platforms (unsupported): Allow access and let browser handle permissions
  callback(true);
};
