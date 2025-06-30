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
      // Only prevent navigation for PDF viewer webviews, not video call windows
      // Check if this is actually a PDF viewer by examining the context
      const currentUrl = webContent.getURL();

      // Skip handling if this is a video call window or not a PDF viewer context
      if (
        currentUrl.includes('video-call-window.html') ||
        currentUrl.includes('app/video-call-window.html')
      ) {
        return;
      }

      // Also check if the navigation URL is an external protocol (like zoommtg://)
      // that should be handled by the system, not intercepted
      try {
        const navUrl = new URL(url);
        const isExternalProtocol = ![
          'http:',
          'https:',
          'file:',
          'data:',
          'about:',
        ].includes(navUrl.protocol);

        // If it's an external protocol, let the system handle it normally
        if (isExternalProtocol) {
          return;
        }
      } catch (e) {
        // If URL parsing fails, let the default handling proceed
        return;
      }

      event.preventDefault();
      setTimeout(() => {
        openExternal(url);
      }, 10);
    });
  });
};
