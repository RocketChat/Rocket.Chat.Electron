import { desktopCapturer } from 'electron';

import { handle } from '../ipc/main';

export const handleDesktopCapturerGetSources = () => {
  handle('desktop-capturer-get-sources', (_event, opts) =>
    desktopCapturer.getSources(opts)
  );
};
