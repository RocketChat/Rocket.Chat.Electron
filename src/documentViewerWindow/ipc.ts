import path from 'path';

import type { Event } from 'electron';
import { app, BrowserWindow, screen } from 'electron';

import { packageJsonInformation } from '../app/main/app';
import { handle } from '../ipc/main';
import { SERVER_DOCUMENT_VIEWER_OPEN_URL } from '../servers/actions';
import { listen, select, watch } from '../store';
import type { RootState } from '../store/rootReducer';
import { getRootWindow } from '../ui/main/rootWindow';
import { watchWindowControls } from '../ui/main/secondaryWindowControls';
import { focusSecondaryWindow } from '../ui/main/secondaryWindowFocus';
import {
  getSavedWindowBounds,
  watchWindowBounds,
} from '../ui/main/secondaryWindowState';
import {
  NOT_FULL_SCREENABLE,
  getTitleBarOptions,
} from '../ui/windowChrome/appearance';
import {
  DOCUMENT_CHANNEL,
  TRANSPARENCY_CHANNEL,
  WINDOW_MIN_HEIGHT,
  WINDOW_MIN_WIDTH,
  WINDOW_SIZE_MULTIPLIER,
} from './constants';
import type { SaveDocumentRequest } from './saveDocument';
import { saveDocument } from './saveDocument';

const isMac = process.platform === 'darwin';

let documentViewerWindow: BrowserWindow | null = null;

export type DocumentRequest = {
  server: string;
  documentUrl: string;
  documentFormat: string;
};

const selectIsTransparencyEnabled = ({
  isTransparentWindowEnabled,
}: RootState): boolean => isTransparentWindowEnabled;

/**
 * The document loads in a webview on the originating server's session, which is
 * what lets an authenticated URL — or a blob the server page created — resolve
 * at all.
 */
const toQuery = ({ server, documentUrl, documentFormat }: DocumentRequest) => ({
  url: documentUrl,
  format: documentFormat,
  partition: `persist:${server}`,
  server,
});

/** Set while a window is being built; see `openDocumentViewerWindow`. */
let pendingCreation: Promise<void> | null = null;

/**
 * The document most recently queued for the reused window while its page is
 * still loading. Only the latest one is sent once loading finishes, so rapid
 * successive opens end up showing the last requested document rather than a
 * stale intermediate one.
 */
let latestPendingRequest: DocumentRequest | null = null;

/**
 * Sends the next document once the window's page has finished loading.
 * Sending while the page is still loading would race the renderer's
 * `DOCUMENT_CHANNEL` listener registration and drop the message silently.
 */
const sendWhenReady = (
  window: BrowserWindow,
  request: DocumentRequest
): void => {
  if (!window.webContents.isLoading()) {
    window.webContents.send(DOCUMENT_CHANNEL, toQuery(request));
    return;
  }

  latestPendingRequest = request;
  window.webContents.once('did-finish-load', () => {
    if (window.isDestroyed() || !latestPendingRequest) return;
    window.webContents.send(DOCUMENT_CHANNEL, toQuery(latestPendingRequest));
    latestPendingRequest = null;
  });
};

const buildDocumentViewerWindow = async (
  request: DocumentRequest
): Promise<void> => {
  const mainWindow = await getRootWindow();
  const winBounds = mainWindow.getNormalBounds();

  const actualScreen = screen.getDisplayNearestPoint({
    x: winBounds.x + winBounds.width / 2,
    y: winBounds.y + winBounds.height / 2,
  });

  const width = Math.round(
    actualScreen.workAreaSize.width * WINDOW_SIZE_MULTIPLIER
  );
  const height = Math.round(
    actualScreen.workAreaSize.height * WINDOW_SIZE_MULTIPLIER
  );
  const x = Math.round(
    (actualScreen.workArea.width - width) / 2 + actualScreen.workArea.x
  );
  const y = Math.round(
    (actualScreen.workArea.height - height) / 2 + actualScreen.workArea.y
  );

  // Where the reader last left this window, falling back to centred on the
  // display nearest the main window.
  const savedBounds = getSavedWindowBounds('documentViewer');

  // Seeds the first paint only; the renderer then follows the setting live.
  const isTransparencyEnabled = isMac && select(selectIsTransparencyEnabled);

  documentViewerWindow = new BrowserWindow({
    ...(savedBounds ?? { width, height, x, y }),
    minWidth: WINDOW_MIN_WIDTH,
    minHeight: WINDOW_MIN_HEIGHT,
    title: 'Document - Rocket.Chat',
    // The toolbar doubles as the title bar wherever the platform allows it, so
    // the window shows one header instead of a native title bar stacked on an
    // in-app one.
    ...getTitleBarOptions(),
    ...NOT_FULL_SCREENABLE,
    // `transparent` cannot be toggled after creation, so — like the root window —
    // the window is always transparent with a vibrancy material on macOS and the
    // setting only decides whether the renderer paints an opaque surface over it.
    ...(isMac
      ? {
          transparent: true,
          vibrancy: 'sidebar' as const,
          visualEffectState: 'active' as const,
        }
      : {}),
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      // The document itself renders in a <webview> on the server's session.
      webviewTag: true,
    },
    show: false,
  });

  await documentViewerWindow.loadFile(
    path.join(app.getAppPath(), 'app/document-viewer-window.html'),
    {
      query: {
        transparent: String(isTransparencyEnabled),
        ...toQuery(request),
      },
    }
  );

  documentViewerWindow.once('ready-to-show', () => {
    documentViewerWindow?.setTitle(
      `Document - ${packageJsonInformation.productName}`
    );
    documentViewerWindow?.show();
  });

  documentViewerWindow.on('closed', () => {
    documentViewerWindow = null;
  });

  documentViewerWindow.webContents.on(
    'will-navigate',
    (event: Event, url: string) => {
      if (!url.startsWith('file://')) {
        event.preventDefault();
      }
    }
  );

  watchWindowBounds('documentViewer', documentViewerWindow);
  watchWindowControls(documentViewerWindow);

  documentViewerWindow.webContents.setWindowOpenHandler(() => ({
    action: 'deny',
  }));
};

/**
 * Shows a document, reusing the open window when there is one.
 *
 * One window rather than one per document: a reader opening a second file
 * almost always means "instead of", and a pile of identical windows is worse
 * than a single one that follows them.
 */
export const openDocumentViewerWindow = async (
  request: DocumentRequest
): Promise<void> => {
  // Building one awaits the main window before the module variable is
  // assigned, so two documents opened in quick succession would each build a
  // window and the second would orphan the first — visible, untracked, and
  // impossible to close from its own channel.
  if (pendingCreation) await pendingCreation;

  if (documentViewerWindow && !documentViewerWindow.isDestroyed()) {
    sendWhenReady(documentViewerWindow, request);
    focusSecondaryWindow(documentViewerWindow);
    return;
  }

  pendingCreation = buildDocumentViewerWindow(request).finally(() => {
    pendingCreation = null;
  });
  await pendingCreation;
};

export const startDocumentViewerWindowHandler = (): void => {
  // Every entry point already dispatches this — the page asking to open a PDF,
  // and the main process intercepting a markdown download — so hooking it here
  // redirects all of them at once. An empty url is the old in-pane viewer's way
  // of saying "closed", and has nothing to open.
  listen(SERVER_DOCUMENT_VIEWER_OPEN_URL, ({ payload }) => {
    if (!payload.documentUrl) return;
    openDocumentViewerWindow(payload as DocumentRequest).catch((error) => {
      console.error('Could not open the document viewer:', error);
    });
  });

  handle('document-viewer-window/close-requested', async () => {
    documentViewerWindow?.close();
  });

  handle(
    'document-viewer-window/save-document',
    async (_webContents, request) => {
      if (!documentViewerWindow || documentViewerWindow.isDestroyed()) {
        return { success: false, error: 'The document viewer is not open' };
      }

      return saveDocument(documentViewerWindow, request as SaveDocumentRequest);
    }
  );

  // Transparency is a renderer concern here, so a change only needs pushing to
  // the open window — no reopen, no restart.
  watch(selectIsTransparencyEnabled, (isEnabled) => {
    if (!documentViewerWindow || documentViewerWindow.isDestroyed()) return;
    documentViewerWindow.webContents.send(TRANSPARENCY_CHANNEL, isEnabled);
  });
};
