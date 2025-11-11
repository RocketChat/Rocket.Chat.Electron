import type { BrowserWindow } from 'electron';
import { shell, systemPreferences } from 'electron';

import {
  askForMediaPermissionSettings,
  showMicrophonePermissionDeniedMessage,
} from './dialogs';

export type MediaPermissionActionType =
  | 'initiateCall'
  | 'answerCall'
  | 'recordMessage';

export const handleMediaPermissionRequest = async (
  mediaTypes: string[],
  parentWindow: BrowserWindow | null,
  actionType: MediaPermissionActionType,
  callback: (allowed: boolean) => void
): Promise<void> => {
  if (process.platform === 'darwin') {
    let microphoneAllowed = true;
    let cameraAllowed = true;

    if (mediaTypes.includes('audio')) {
      const micStatus = systemPreferences.getMediaAccessStatus('microphone');
      if (micStatus === 'granted') {
        microphoneAllowed = true;
      } else if (micStatus === 'not-determined') {
        microphoneAllowed =
          await systemPreferences.askForMediaAccess('microphone');
      } else {
        microphoneAllowed = false;
        if (parentWindow && !parentWindow.isDestroyed()) {
          await showMicrophonePermissionDeniedMessage(actionType, parentWindow);
        }
      }
    }

    if (mediaTypes.includes('video')) {
      const camStatus = systemPreferences.getMediaAccessStatus('camera');
      if (camStatus === 'granted') {
        cameraAllowed = true;
      } else if (camStatus === 'not-determined') {
        cameraAllowed = await systemPreferences.askForMediaAccess('camera');
      } else {
        cameraAllowed = false;
        if (parentWindow && !parentWindow.isDestroyed()) {
          let permissionType: 'microphone' | 'camera' | 'both';
          if (mediaTypes.includes('audio') && mediaTypes.includes('video')) {
            permissionType = 'both';
          } else {
            permissionType = 'camera';
          }
          await askForMediaPermissionSettings(
            permissionType,
            parentWindow
          ).then((openSettings) => {
            if (openSettings) {
              shell.openExternal(
                'x-apple.systempreferences:com.apple.preference.security?Privacy_Camera'
              );
            }
          });
        }
      }
    }

    callback(microphoneAllowed && cameraAllowed);
    return;
  }

  if (process.platform === 'win32') {
    let microphoneAllowed = true;
    let cameraAllowed = true;

    if (mediaTypes.includes('audio')) {
      const micStatus = systemPreferences.getMediaAccessStatus('microphone');
      if (micStatus === 'granted') {
        microphoneAllowed = true;
      } else if (micStatus === 'denied') {
        microphoneAllowed = false;
        if (parentWindow && !parentWindow.isDestroyed()) {
          await showMicrophonePermissionDeniedMessage(actionType, parentWindow);
        }
      } else {
        microphoneAllowed = true;
      }
    }

    if (mediaTypes.includes('video')) {
      const camStatus = systemPreferences.getMediaAccessStatus('camera');
      if (camStatus === 'granted') {
        cameraAllowed = true;
      } else if (camStatus === 'denied') {
        cameraAllowed = false;
        if (parentWindow && !parentWindow.isDestroyed()) {
          let permissionType: 'microphone' | 'camera' | 'both';
          if (mediaTypes.includes('audio') && mediaTypes.includes('video')) {
            permissionType = 'both';
          } else {
            permissionType = 'camera';
          }
          await askForMediaPermissionSettings(
            permissionType,
            parentWindow
          ).then((openSettings) => {
            if (openSettings) {
              shell.openExternal('ms-settings:privacy-camera');
            }
          });
        }
      } else {
        cameraAllowed = true;
      }
    }

    callback(microphoneAllowed && cameraAllowed);
    return;
  }

  callback(true);
};
