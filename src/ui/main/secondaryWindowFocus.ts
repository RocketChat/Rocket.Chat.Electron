import type { BrowserWindow } from 'electron';

/**
 * Brings an already-open secondary window back to the front.
 *
 * A bare `focus()` does not deminiaturize on macOS or restore on Windows, so
 * reopening a minimized window from the menu/sidebar appeared to do nothing.
 */
export const focusSecondaryWindow = (browserWindow: BrowserWindow): void => {
  if (browserWindow.isMinimized()) {
    browserWindow.restore();
  }
  browserWindow.show();
  browserWindow.focus();
};
