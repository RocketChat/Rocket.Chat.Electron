import type { WebContents } from 'electron';
import { BrowserWindow } from 'electron';

import { handle } from '../../ipc/main';
import { WINDOW_MAXIMIZED_CHANNEL } from '../windowChrome/channels';

/**
 * Minimise, maximise and close for the secondary windows, whose toolbars draw
 * their own caption buttons on the platforms where the native title bar is
 * hidden.
 *
 * The handlers act on whichever window sent the request rather than taking a
 * window id, so one registration serves the log viewer, downloads and settings
 * windows alike.
 */
const senderWindow = (webContents: WebContents): BrowserWindow | null =>
  BrowserWindow.fromWebContents(webContents);

export const startSecondaryWindowControlsHandler = (): void => {
  handle('secondary-window/minimize', async (webContents) => {
    senderWindow(webContents)?.minimize();
  });

  handle('secondary-window/toggle-maximize', async (webContents) => {
    const browserWindow = senderWindow(webContents);
    if (!browserWindow) return;

    if (browserWindow.isMaximized()) {
      browserWindow.unmaximize();
      return;
    }
    browserWindow.maximize();
  });

  handle('secondary-window/close', async (webContents) => {
    senderWindow(webContents)?.close();
  });

  handle(
    'secondary-window/is-maximized',
    async (webContents) => senderWindow(webContents)?.isMaximized() ?? false
  );
};

/**
 * Keeps the window's caption buttons in step with its state, so the glyph shows
 * restore once maximised — including when the change came from a double click
 * on the toolbar or a keyboard shortcut rather than from the buttons.
 */
export const watchWindowControls = (browserWindow: BrowserWindow): void => {
  const notify = (): void => {
    if (browserWindow.isDestroyed()) return;
    browserWindow.webContents.send(
      WINDOW_MAXIMIZED_CHANNEL,
      browserWindow.isMaximized()
    );
  };

  browserWindow.addListener('maximize', notify);
  browserWindow.addListener('unmaximize', notify);
};
