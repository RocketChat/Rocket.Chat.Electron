import { desktopCapturer } from 'electron';

import { handle } from '../ipc/main';
import { isJitsiServerAllowed } from './main';

let permitted = false;
let dontAskAgain = false;
let firstAskPermission = true;

export const handleDesktopCapturerGetSources = () => {
  handle('desktop-capturer-get-sources', async (_event, opts) => {
    if (permitted) return desktopCapturer.getSources(opts[0]);

    if (dontAskAgain) return [];

    if (firstAskPermission) {
      firstAskPermission = false;
      const askResult = await isJitsiServerAllowed(opts[1]);
      permitted = askResult.allowed;
      dontAskAgain = askResult.dontAskAgain;
    }
    return [];
  });
};
