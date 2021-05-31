import {
  PermissionRequestHandlerHandlerDetails,
  systemPreferences,
  WebContents,
} from 'electron';
import { useEffect } from 'react';

import { isProtocolAllowed } from '../../isProtocolAllowed';

export const usePermissionRequestHandling = (
  guestWebContents: WebContents | undefined
): void => {
  useEffect(() => {
    if (!guestWebContents) {
      return;
    }

    const handlePermissionRequest = async (
      _webContents: WebContents,
      permission: string,
      callback: (permissionGranted: boolean) => void,
      details: PermissionRequestHandlerHandlerDetails
    ) => {
      switch (permission) {
        case 'media': {
          if (process.platform !== 'darwin') {
            callback(true);
            return;
          }

          const { mediaTypes = [] } = details;
          const allowed =
            (!mediaTypes.includes('audio') ||
              (await systemPreferences.askForMediaAccess('microphone'))) &&
            (!mediaTypes.includes('video') ||
              (await systemPreferences.askForMediaAccess('camera')));
          callback(allowed);
          return;
        }

        case 'geolocation':
        case 'notifications':
        case 'midiSysex':
        case 'pointerLock':
        case 'fullscreen':
          callback(true);
          return;

        case 'openExternal': {
          if (!details.externalURL) {
            callback(false);
            return;
          }

          const allowed = await isProtocolAllowed(details.externalURL);
          callback(allowed);
          return;
        }

        default:
          callback(false);
      }
    };

    guestWebContents.session.setPermissionRequestHandler(
      handlePermissionRequest
    );

    return () => {
      guestWebContents.session.setPermissionRequestHandler(null);
    };
  }, [guestWebContents]);
};
