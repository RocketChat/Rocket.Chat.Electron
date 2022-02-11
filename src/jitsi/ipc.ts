import { desktopCapturer } from 'electron';

import { handle } from '../ipc/main';
import { askForJitsiCaptureScreenPermission } from '../ui/main/dialogs';

let permitted = false;
let dontAskAgain = false;
let firstAskPermission = true;

export const handleDesktopCapturerGetSources = () => {
  handle('desktop-capturer-get-sources', async (_event, opts) => {
    if (permitted) return desktopCapturer.getSources(opts[0]);

    if (dontAskAgain) return [];

    if (firstAskPermission) {
      firstAskPermission = false;
      const askPermission = await askForJitsiCaptureScreenPermission(opts[1]);

      permitted = askPermission.allowed;

      if (!permitted) {
        return [];
      }

      permitted = askPermission.allowed;
      dontAskAgain = askPermission.dontAskAgain;
    } else {
      return [];
    }
  });
};
