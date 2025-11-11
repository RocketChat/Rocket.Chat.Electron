import type { BrowserWindow } from 'electron';
import { shell, systemPreferences } from 'electron';

import { askForMediaPermissionSettings } from './dialogs';

export type MediaPermissionActionType =
  | 'initiateCall'
  | 'answerCall'
  | 'recordMessage';

export const handleMediaPermissionRequest = async (
  mediaTypes: string[],
  parentWindow: BrowserWindow | null,
  // eslint-disable-next-line @typescript-eslint/naming-convention
  _actionType: MediaPermissionActionType,
  callback: (allowed: boolean) => void
): Promise<void> => {
  if (process.platform === 'darwin') {
    const needsAudio = mediaTypes.includes('audio');
    const needsVideo = mediaTypes.includes('video');

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

    if (micStatus === 'not-determined') {
      microphoneAllowed =
        await systemPreferences.askForMediaAccess('microphone');
    }
    if (camStatus === 'not-determined') {
      cameraAllowed = await systemPreferences.askForMediaAccess('camera');
    }

    if (
      micStatus === 'denied' ||
      micStatus === 'restricted' ||
      camStatus === 'denied' ||
      camStatus === 'restricted'
    ) {
      if (parentWindow && !parentWindow.isDestroyed()) {
        let permissionType: 'microphone' | 'camera' | 'both';
        const micDenied = micStatus === 'denied' || micStatus === 'restricted';
        const camDenied = camStatus === 'denied' || camStatus === 'restricted';

        if (micDenied && camDenied) {
          permissionType = 'both';
        } else if (micDenied) {
          permissionType = 'microphone';
        } else {
          permissionType = 'camera';
        }

        await askForMediaPermissionSettings(permissionType, parentWindow).then(
          (openSettings) => {
            if (openSettings) {
              if (permissionType === 'microphone') {
                shell.openExternal(
                  'x-apple.systempreferences:com.apple.preference.security?Privacy_Microphone'
                );
              } else if (permissionType === 'camera') {
                shell.openExternal(
                  'x-apple.systempreferences:com.apple.preference.security?Privacy_Camera'
                );
              } else {
                shell.openExternal(
                  'x-apple.systempreferences:com.apple.preference.security?Privacy_Microphone'
                );
              }
            }
          }
        );
      }

      if (micStatus === 'denied' || micStatus === 'restricted') {
        microphoneAllowed = false;
      }
      if (camStatus === 'denied' || camStatus === 'restricted') {
        cameraAllowed = false;
      }
    }

    callback(microphoneAllowed && cameraAllowed);
    return;
  }

  if (process.platform === 'win32') {
    const needsAudio = mediaTypes.includes('audio');
    const needsVideo = mediaTypes.includes('video');

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

    if (micStatus === 'denied' || camStatus === 'denied') {
      if (parentWindow && !parentWindow.isDestroyed()) {
        let permissionType: 'microphone' | 'camera' | 'both';
        const micDenied = micStatus === 'denied';
        const camDenied = camStatus === 'denied';

        if (micDenied && camDenied) {
          permissionType = 'both';
        } else if (micDenied) {
          permissionType = 'microphone';
        } else {
          permissionType = 'camera';
        }

        await askForMediaPermissionSettings(permissionType, parentWindow).then(
          (openSettings) => {
            if (openSettings) {
              if (permissionType === 'microphone') {
                shell.openExternal('ms-settings:privacy-microphone');
              } else if (permissionType === 'camera') {
                shell.openExternal('ms-settings:privacy-camera');
              } else {
                shell.openExternal('ms-settings:privacy-microphone');
              }
            }
          }
        );
      }

      if (micStatus === 'denied') {
        microphoneAllowed = false;
      }
      if (camStatus === 'denied') {
        cameraAllowed = false;
      }
    }

    callback(microphoneAllowed && cameraAllowed);
    return;
  }

  callback(true);
};
