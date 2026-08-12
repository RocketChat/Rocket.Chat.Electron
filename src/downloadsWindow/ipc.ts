import path from 'path';

import type { Event } from 'electron';
import { app, BrowserWindow, dialog, screen } from 'electron';
import i18next from 'i18next';

import { packageJsonInformation } from '../app/main/app';
import { handle } from '../ipc/main';
import { dispatch, listen, select, watch } from '../store';
import type { RootState } from '../store/rootReducer';
import {
  DOWNLOADS_WINDOW_OPEN_STATE_CHANGED,
  SIDE_BAR_DOWNLOADS_BUTTON_CLICKED,
} from '../ui/actions';
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
  TRANSPARENCY_CHANNEL,
  WINDOW_MIN_HEIGHT,
  WINDOW_MIN_WIDTH,
  WINDOW_SIZE_MULTIPLIER,
} from './constants';

const t = i18next.t.bind(i18next);

const isMac = process.platform === 'darwin';

let downloadsWindow: BrowserWindow | null = null;

/**
 * Set once quitting starts. The window's `closed` handler fires both when the
 * reader closes it and when the app tears its windows down on quit; without this
 * the quit path would record "closed" and defeat restoring it next launch.
 */
let isAppQuitting = false;

const selectIsTransparencyEnabled = ({
  isTransparentWindowEnabled,
}: RootState): boolean => isTransparentWindowEnabled;

/** Set while a window is being built; see `createDownloadsWindow`. */
let pendingCreation: Promise<void> | null = null;

const buildDownloadsWindow = async (focusOnShow: boolean): Promise<void> => {
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
  const savedBounds = getSavedWindowBounds('downloads');

  // Seeds the first paint only; the renderer then follows the setting live.
  const isTransparencyEnabled = isMac && select(selectIsTransparencyEnabled);

  downloadsWindow = new BrowserWindow({
    ...(savedBounds ?? { width, height, x, y }),
    minWidth: WINDOW_MIN_WIDTH,
    minHeight: WINDOW_MIN_HEIGHT,
    title: 'Downloads - Rocket.Chat',
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
    },
    show: false,
  });

  downloadsWindow.loadFile(
    path.join(app.getAppPath(), 'app/downloads-window.html'),
    { query: { transparent: String(isTransparencyEnabled) } }
  );

  downloadsWindow.once('ready-to-show', () => {
    downloadsWindow?.setTitle(
      `Downloads - ${packageJsonInformation.productName}`
    );
    if (focusOnShow) {
      downloadsWindow?.show();
      return;
    }
    // Restored at launch: show it without stealing focus from the main window.
    downloadsWindow?.showInactive();
  });

  dispatch({ type: DOWNLOADS_WINDOW_OPEN_STATE_CHANGED, payload: true });

  downloadsWindow.on('closed', () => {
    downloadsWindow = null;
    if (!isAppQuitting) {
      dispatch({ type: DOWNLOADS_WINDOW_OPEN_STATE_CHANGED, payload: false });
    }
  });

  downloadsWindow.webContents.on(
    'will-navigate',
    (event: Event, url: string) => {
      if (!url.startsWith('file://')) {
        event.preventDefault();
      }
    }
  );

  watchWindowBounds('downloads', downloadsWindow);
  watchWindowControls(downloadsWindow);

  downloadsWindow.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
};

/**
 * Opens the window, or focuses the one already open.
 *
 * Building one awaits the main window before the module variable is assigned,
 * so two opens arriving in that gap would each build a window and the second
 * would orphan the first — visible, untracked, and impossible to close from its
 * own channel. Every caller comes through here, so only one is ever in flight.
 */
const createDownloadsWindow = async (focusOnShow: boolean): Promise<void> => {
  if (pendingCreation) await pendingCreation;

  if (downloadsWindow && !downloadsWindow.isDestroyed()) {
    focusSecondaryWindow(downloadsWindow);
    return;
  }

  pendingCreation = buildDownloadsWindow(focusOnShow).finally(() => {
    pendingCreation = null;
  });
  await pendingCreation;
};

export const openDownloadsWindow = (): Promise<void> =>
  createDownloadsWindow(true);

/**
 * Reopens the window at launch when it was open at shutdown, without taking
 * focus from the main window.
 */
export const restoreDownloadsWindow = async (): Promise<void> => {
  if (
    !select(({ isDownloadsWindowOpen }: RootState) => isDownloadsWindowOpen)
  ) {
    return;
  }
  await createDownloadsWindow(false);
};

export const startDownloadsWindowHandler = (): void => {
  app.on('before-quit', () => {
    isAppQuitting = true;
  });

  handle('downloads-window/open-window', openDownloadsWindow);

  // Every entry point — the menu items, the titlebar indicator and the
  // download-finished notification — already dispatches this, so hooking it
  // here redirects all of them at once.
  listen(SIDE_BAR_DOWNLOADS_BUTTON_CLICKED, () => {
    openDownloadsWindow();
  });

  handle('downloads-window/close-requested', async () => {
    downloadsWindow?.close();
  });

  handle('downloads-window/confirm-clear-all', async () => {
    if (!downloadsWindow || downloadsWindow.isDestroyed()) {
      return false;
    }

    const { response } = await dialog.showMessageBox(downloadsWindow, {
      type: 'warning',
      buttons: [
        t('dialog.clearDownloads.yes'),
        t('dialog.clearDownloads.cancel'),
      ],
      defaultId: 1,
      cancelId: 1,
      title: t('dialog.clearDownloads.title'),
      message: t('dialog.clearDownloads.message'),
    });

    return response === 0;
  });

  // Transparency is a renderer concern here, so a change only needs pushing to
  // the open window — no reopen, no restart.
  watch(selectIsTransparencyEnabled, (isEnabled) => {
    if (!downloadsWindow || downloadsWindow.isDestroyed()) return;
    downloadsWindow.webContents.send(TRANSPARENCY_CHANNEL, isEnabled);
  });
};
