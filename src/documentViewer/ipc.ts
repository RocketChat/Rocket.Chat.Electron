import { BrowserWindow } from 'electron';

import { handle } from '../ipc/main';

export const startDocumentViewerHandler = (): void => {
  handle('document-viewer/open-window', async (event, url, format, options) => {
    const validUrl = new URL(url);
    const allowedProtocols = ['http:', 'https:'];
    if (!allowedProtocols.includes(validUrl.protocol)) {
      return;
    }
    const documentViewerWindow = new BrowserWindow({
      width: 800,
      height: 600,
      webPreferences: {
        session: event.session,
        plugins: true,
      },
    });
    documentViewerWindow.loadURL(url);
    documentViewerWindow.on('ready-to-show', () => {
      documentViewerWindow.show();
    });
  });
};
