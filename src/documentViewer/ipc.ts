import { webContents } from 'electron';

import { handle } from '../ipc/main';
import { SERVER_DOCUMENT_VIEWER_OPEN_URL } from '../servers/actions';
import { dispatch, listen, select } from '../store';
import { WEBVIEW_PDF_VIEWER_ATTACHED } from '../ui/actions';
import { openExternal } from '../utils/browserLauncher';

export const startDocumentViewerHandler = (): void => {
  handle(
    'document-viewer/open-window',
    async (event, url, _format, _options) => {
      const validUrl = new URL(url);
      const allowedProtocols = ['http:', 'https:'];
      if (!allowedProtocols.includes(validUrl.protocol)) {
        return;
      }
      const server = select(({ servers }) =>
        servers.find(
          (s) => new URL(s.url).origin === new URL(event.getURL()).origin
        )
      );
      if (!server) {
        return;
      }

      dispatch({
        type: SERVER_DOCUMENT_VIEWER_OPEN_URL,
        payload: { server: server.url, documentUrl: url },
      });
    }
  );

  listen(WEBVIEW_PDF_VIEWER_ATTACHED, async (action) => {
    const webContentsId = action.payload.WebContentsId;
    const webContent = webContents.fromId(webContentsId);
    if (!webContent) {
      return;
    }
    webContent.on('will-navigate', (event, url) => {
      event.preventDefault();
      setTimeout(() => {
        openExternal(url);
      }, 10);
    });
  });
};
