import path from 'path';

import type { Rectangle, NativeImage, WebPreferences } from 'electron';
import { app, BrowserWindow, nativeImage, nativeTheme, screen } from 'electron';
import i18next from 'i18next';
import { createStructuredSelector } from 'reselect';

import {
  APP_MACHINE_THEME_SET,
  APP_MAIN_WINDOW_TITLE_SET,
} from '../../app/actions';
import { setupRootWindowReload } from '../../app/main/dev';
import { select, watch, listen, dispatchLocal, dispatch } from '../../store';
import type { RootState } from '../../store/rootReducer';
import { ROOT_WINDOW_STATE_CHANGED, WEBVIEW_FOCUS_REQUESTED } from '../actions';
import type { WindowState } from '../common';
import { selectGlobalBadge, selectGlobalBadgeCount } from '../selectors';
import { debounce } from './debounce';
import { getTrayIconPath } from './icons';

const webPreferences: WebPreferences = {
  nodeIntegration: true,
  nodeIntegrationInSubFrames: true,
  contextIsolation: false,
  webviewTag: true,
};

const selectRootWindowState = ({ rootWindowState }: RootState): WindowState =>
  rootWindowState ?? {
    bounds: {
      x: 0,
      y: 0,
      width: 0,
      height: 0,
    },
    focused: false,
    fullscreen: false,
    maximized: false,
    minimized: false,
    normal: false,
    visible: false,
  };

let _rootWindow: BrowserWindow;
let tempWindow: BrowserWindow;

export const getRootWindow = (): Promise<BrowserWindow> =>
  new Promise((resolve, reject) => {
    setTimeout(() => {
      _rootWindow ? resolve(_rootWindow) : reject(new Error());
    }, 300);
  });

const platformTitleBarStyle =
  process.platform === 'darwin' ? 'hidden' : 'default';

export const createRootWindow = (): void => {
  _rootWindow = new BrowserWindow({
    width: 1000,
    height: 600,
    minWidth: 400,
    minHeight: 400,
    titleBarStyle: platformTitleBarStyle,
    backgroundColor: '#2f343d',
    show: false,
    webPreferences,
  });

  _rootWindow.addListener('close', (event) => {
    event.preventDefault();
  });

  tempWindow.destroy();
};

export const normalizeNumber = (value: number | undefined): number =>
  value && isFinite(1 / value) ? value : 0;

export const isInsideSomeScreen = ({
  x,
  y,
  width,
  height,
}: Rectangle): boolean =>
  screen
    .getAllDisplays()
    .some(
      ({ bounds }) =>
        x >= bounds.x &&
        y >= bounds.y &&
        x + width <= bounds.x + bounds.width &&
        y + height <= bounds.y + bounds.height
    );

export const applyRootWindowState = (browserWindow: BrowserWindow): void => {
  const rootWindowState = select(selectRootWindowState);
  const isTrayIconEnabled = select(
    ({ isTrayIconEnabled }) => isTrayIconEnabled
  );

  let { x = null, y = null } = rootWindowState.bounds;
  let { width, height } = rootWindowState.bounds;
  if (
    x === null ||
    y === null ||
    !isInsideSomeScreen({ x, y, width, height })
  ) {
    const primaryDisplay = screen.getPrimaryDisplay();
    const {
      bounds: { width: primaryDisplayWidth, height: primaryDisplayHeight },
    } = primaryDisplay;
    x = Math.round((primaryDisplayWidth - width) / 2);
    y = Math.round((primaryDisplayHeight - height) / 2);
    width = normalizeNumber(primaryDisplay.workAreaSize.width * 0.9);
    height = normalizeNumber(primaryDisplay.workAreaSize.height * 0.9);
  }
  if (browserWindow.isVisible()) {
    return;
  }

  x = normalizeNumber(x);
  y = normalizeNumber(y);
  width = normalizeNumber(width);
  height = normalizeNumber(height);

  if (
    browserWindow &&
    Number.isInteger(width) &&
    Number.isInteger(height) &&
    Number.isInteger(x) &&
    Number.isInteger(y)
  ) {
    browserWindow.setBounds({
      width,
      height,
      x,
      y,
    });
  }

  if (rootWindowState.maximized) {
    browserWindow.maximize();
  }

  if (rootWindowState.minimized) {
    browserWindow.minimize();
  }

  if (rootWindowState.fullscreen) {
    browserWindow.setFullScreen(true);
  }

  if (rootWindowState.visible || !isTrayIconEnabled) {
    browserWindow.show();
  }

  if (rootWindowState.focused) {
    browserWindow.focus();
  }
};

const fetchRootWindowState = async (): Promise<
  ReturnType<typeof selectRootWindowState>
> => {
  const browserWindow = await getRootWindow();
  return {
    focused: browserWindow?.isFocused(),
    visible: browserWindow?.isVisible(),
    maximized: browserWindow?.isMaximized(),
    minimized: browserWindow?.isMinimized(),
    fullscreen: browserWindow?.isFullScreen(),
    normal: browserWindow?.isNormal(),
    bounds: browserWindow?.getNormalBounds(),
  };
};

export const setupRootWindow = (): void => {
  const unsubscribers = [
    watch(selectGlobalBadgeCount, async (globalBadgeCount) => {
      const browserWindow = await getRootWindow();

      if (browserWindow.isFocused() || globalBadgeCount === 0) {
        return;
      }

      const { isShowWindowOnUnreadChangedEnabled, isFlashFrameEnabled } =
        select(
          ({ isShowWindowOnUnreadChangedEnabled, isFlashFrameEnabled }) => ({
            isShowWindowOnUnreadChangedEnabled,
            isFlashFrameEnabled,
          })
        );

      if (isShowWindowOnUnreadChangedEnabled && !browserWindow.isVisible()) {
        const isMinimized = browserWindow.isMinimized();
        const isMaximized = browserWindow.isMaximized();

        browserWindow.showInactive();

        if (isMinimized) {
          browserWindow.minimize();
        }

        if (isMaximized) {
          browserWindow.maximize();
        }
        return;
      }

      if (isFlashFrameEnabled && process.platform !== 'darwin') {
        browserWindow.flashFrame(true);
      }
    }),
    watch(
      ({ currentView, servers }) => {
        const currentServer =
          typeof currentView === 'object'
            ? servers.find(({ url }) => url === currentView.url)
            : null;
        return currentServer?.pageTitle || currentServer?.title || app.name;
      },
      async (windowTitle) => {
        const browserWindow = await getRootWindow();
        browserWindow.setTitle(windowTitle);
        dispatch({
          type: APP_MAIN_WINDOW_TITLE_SET,
          payload: windowTitle,
        });
      }
    ),
    listen(WEBVIEW_FOCUS_REQUESTED, async () => {
      const rootWindow = await getRootWindow();
      rootWindow.focus();
      rootWindow.show();
    }),
  ];

  const fetchAndDispatchWindowState = debounce(async (): Promise<void> => {
    dispatchLocal({
      type: ROOT_WINDOW_STATE_CHANGED,
      payload: await fetchRootWindowState(),
    });
  }, 1000);

  getRootWindow().then((rootWindow) => {
    rootWindow.addListener('show', fetchAndDispatchWindowState);
    rootWindow.addListener('hide', fetchAndDispatchWindowState);
    rootWindow.addListener('focus', fetchAndDispatchWindowState);
    rootWindow.addListener('blur', fetchAndDispatchWindowState);
    rootWindow.addListener('maximize', fetchAndDispatchWindowState);
    rootWindow.addListener('unmaximize', fetchAndDispatchWindowState);
    rootWindow.addListener('minimize', fetchAndDispatchWindowState);
    rootWindow.addListener('restore', fetchAndDispatchWindowState);
    rootWindow.addListener('resize', fetchAndDispatchWindowState);
    rootWindow.addListener('move', fetchAndDispatchWindowState);

    fetchAndDispatchWindowState();

    rootWindow.addListener('focus', async () => {
      rootWindow.flashFrame(false);
    });

    rootWindow.addListener('close', async () => {
      if (rootWindow?.isFullScreen()) {
        await new Promise<void>((resolve) =>
          rootWindow.once('leave-full-screen', () => resolve())
        );
        rootWindow.setFullScreen(false);
      }

      if (process.platform !== 'linux') rootWindow.blur();

      const isTrayIconEnabled = select(
        ({ isTrayIconEnabled }) => isTrayIconEnabled ?? true
      );

      if (process.platform === 'darwin' || isTrayIconEnabled) {
        rootWindow.hide();
        return;
      }

      const isMinimizeOnCloseEnabled = select(
        ({ isMinimizeOnCloseEnabled }) => isMinimizeOnCloseEnabled ?? true
      );

      if (process.platform === 'win32' && isMinimizeOnCloseEnabled) {
        rootWindow.minimize();
        return;
      }

      app.quit();
    });

    unsubscribers.push(() => {
      rootWindow.removeAllListeners();
      rootWindow.close();
    });
  });

  if (process.platform === 'linux' || process.platform === 'win32') {
    const selectRootWindowIcon = createStructuredSelector({
      globalBadge: selectGlobalBadge,
      rootWindowIcon: ({ rootWindowIcon }: RootState) => rootWindowIcon,
    });

    unsubscribers.push(
      watch(selectRootWindowIcon, async ({ globalBadge, rootWindowIcon }) => {
        const browserWindow = await getRootWindow();

        if (!rootWindowIcon) {
          browserWindow.setIcon(
            nativeImage.createFromPath(
              getTrayIconPath({
                platform: process.platform,
                badge: globalBadge,
              })
            )
          );
          return;
        }

        const icon = nativeImage.createEmpty();
        const { scaleFactor } = screen.getPrimaryDisplay();

        if (process.platform === 'linux') {
          rootWindowIcon.icon.forEach((representation) => {
            icon.addRepresentation({
              ...representation,
              scaleFactor,
            });
          });
        }

        if (process.platform === 'win32') {
          for (const representation of rootWindowIcon.icon) {
            icon.addRepresentation({
              ...representation,
              scaleFactor: representation.width ?? 0 / 32,
            });
          }
        }

        browserWindow.setIcon(icon);

        if (process.platform === 'win32') {
          let overlayIcon: NativeImage | null = null;
          const overlayDescription: string =
            (typeof globalBadge === 'number' &&
              i18next.t('unreadMention', {
                appName: app.name,
                count: globalBadge,
              })) ||
            (globalBadge === '•' &&
              i18next.t('unreadMessage', { appName: app.name })) ||
            i18next.t('noUnreadMessage', { appName: app.name });
          if (rootWindowIcon.overlay) {
            overlayIcon = nativeImage.createEmpty();

            for (const representation of rootWindowIcon.overlay) {
              overlayIcon.addRepresentation({
                ...representation,
                scaleFactor: 1,
              });
            }
          }

          const isTrayIconEnabled = select(
            ({ isTrayIconEnabled }) => isTrayIconEnabled ?? true
          );

          if (!isTrayIconEnabled) {
            const t = i18next.t.bind(i18next);
            const translate = `taskbar.${overlayDescription}`;
            const taskbarTitle =
              globalBadge !== undefined
                ? `(${globalBadge}) ${t(translate)}`
                : t(translate);

            browserWindow.setTitle(taskbarTitle);
          }
          browserWindow.setOverlayIcon(overlayIcon, overlayDescription);
        }
      }),
      watch(
        ({ isMenuBarEnabled }) => isMenuBarEnabled,
        async (isMenuBarEnabled) => {
          const browserWindow = await getRootWindow();
          browserWindow.autoHideMenuBar = !isMenuBarEnabled;
          browserWindow.setMenuBarVisibility(isMenuBarEnabled);
        }
      )
    );
  }

  app.addListener('before-quit', () => {
    unsubscribers.forEach((unsubscriber) => unsubscriber());
  });
};

const ensureWindowsMediaRegistration = async (): Promise<void> => {
  if (process.platform !== 'win32') {
    return;
  }

  try {
    const browserWindow = await getRootWindow();
    await browserWindow.webContents.executeJavaScript(`
      if (!window._rocketChatMediaRegistered) {
        window._rocketChatMediaRegistered = true;
        navigator.mediaDevices.getUserMedia({ audio: true, video: false })
          .then(() => console.log('Media access registered with Windows'))
          .catch(() => console.log('Media registration attempted'));
      }
    `);
  } catch (error) {
    console.log('Media registration failed:', error);
  }
};

export const showRootWindow = async (): Promise<void> => {
  const browserWindow = await getRootWindow();

  browserWindow.loadFile(path.join(app.getAppPath(), 'app/index.html'));

  if (process.env.NODE_ENV === 'development') {
    setupRootWindowReload(browserWindow.webContents);
  }

  return new Promise((resolve) => {
    browserWindow.once('ready-to-show', () => {
      applyRootWindowState(browserWindow);

      const isTrayIconEnabled = select(
        ({ isTrayIconEnabled }) => isTrayIconEnabled
      );

      if (app.commandLine.hasSwitch('start-hidden') && isTrayIconEnabled) {
        console.debug('Start application in background');
        browserWindow.hide();
      }

      setupRootWindow();
      ensureWindowsMediaRegistration();

      resolve();
    });
  });
};

export const watchMachineTheme = (): void => {
  dispatchMachineTheme();
  nativeTheme.on('updated', () => {
    dispatchMachineTheme();
  });
};

const dispatchMachineTheme = (): void => {
  const isDarkMode = nativeTheme.shouldUseDarkColors;
  dispatch({
    type: APP_MACHINE_THEME_SET,
    payload: isDarkMode ? 'dark' : 'light',
  });
};

export const exportLocalStorage = async (): Promise<Record<string, string>> => {
  try {
    tempWindow = new BrowserWindow({
      show: false,
      webPreferences,
    });

    tempWindow.loadFile(path.join(app.getAppPath(), 'app/index.html'));

    await new Promise<void>((resolve) => {
      tempWindow.once('ready-to-show', () => {
        resolve();
      });
    });

    return tempWindow.webContents.executeJavaScript(`(() => {
      const data = ({...localStorage})
      localStorage.clear();
      return data;
    })()`);
  } catch (error) {
    console.error(error);
    return {};
  }
};
