import { desktopCapturer } from 'electron';

import { handle } from '../ipc/main';
import { isJitsiServerAllowed } from './main';

let permitted = false;
let dontAskAgain = false;
let firstAskPermission = true;

export const handleJitsiDesktopCapturerGetSources = () => {
  handle(
    'jitsi-desktop-capturer-get-sources',
    async (_event, [opts, jitsiDomain]) => {
      if (permitted) return desktopCapturer.getSources(opts);

      if (dontAskAgain) return [];

      if (firstAskPermission) {
        firstAskPermission = false;
        const askResult = await isJitsiServerAllowed(jitsiDomain);
        permitted = askResult.allowed;
        dontAskAgain = askResult.dontAskAgain;
      }
      return [];
    }
  );
};
