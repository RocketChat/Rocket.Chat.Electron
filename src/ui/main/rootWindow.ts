import path from 'path';

import {
  app,
  BrowserWindow,
  nativeImage,
  screen,
  Rectangle,
  NativeImage,
  WebPreferences,
} from 'electron';
import i18next from 'i18next';
import { createStructuredSelector } from 'reselect';

import { setupRootWindowReload } from '../../app/main/dev';
import { dispatch, select, watch, listen } from '../../store';
import { RootState } from '../../store/rootReducer';
import {
  ROOT_WINDOW_STATE_CHANGED,
  WEBVIEW_FOCUS_REQUESTED,
} from '../actions';
import { RootWindowIcon, WindowState } from '../common';
import {
  selectGlobalBadge,
  selectGlobalBadgeCount,
} from '../selectors';
import { getTrayIconPath } from './icons';


const webPreferences: WebPreferences = {
  nodeIntegration: true,
  nodeIntegrationInSubFrames: true,
  webviewTag: true,
  worldSafeExecuteJavaScript: true,
};

const selectRootWindowState = ({ rootWindowState }: RootState): WindowState => rootWindowState ?? {
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

export const getRootWindow = (): Promise<BrowserWindow> =>
  new Promise((resolve, reject) => {
    setImmediate(() => {
      _rootWindow ? resolve(_rootWindow) : reject();
    });
  });

export const createRootWindow = (): void => {
  _rootWindow = new BrowserWindow({
    width: 1000,
    height: 600,
    minWidth: 400,
    minHeight: 400,
    titleBarStyle: 'hidden',
    backgroundColor: '#2f343d',
    show: false,
    webPreferences,
  });

  _rootWindow.addListener('close', (event) => {
    event.preventDefault();
  });
};

const isInsideSomeScreen = ({ x, y, width, height }: Rectangle): boolean =>
  screen.getAllDisplays()
    .some(({ bounds }) => x >= bounds.x && y >= bounds.y
      && x + width <= bounds.x + bounds.width && y + height <= bounds.y + bounds.height,
    );

export const applyRootWindowState = (browserWindow: BrowserWindow): void => {
  const rootWindowState = select(selectRootWindowState);
  const isTrayIconEnabled = select(({ isTrayIconEnabled }) => isTrayIconEnabled);

  let { x, y } = rootWindowState.bounds;
  const { width, height } = rootWindowState.bounds;
  if (!isInsideSomeScreen({ x, y, width, height })) {
    const {
      bounds: {
        width: primaryDisplayWidth,
        height: primaryDisplayHeight,
      },
    } = screen.getPrimaryDisplay();
    x = Math.round((primaryDisplayWidth - width) / 2);
    y = Math.round((primaryDisplayHeight - height) / 2);
  }

  if (browserWindow.isVisible()) {
    return;
  }

  if (!x || !y) {
    browserWindow.setBounds({ width, height });
  } else {
    browserWindow.setBounds({ x, y, width, height });
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

const fetchRootWindowState = async (): Promise<ReturnType<typeof selectRootWindowState>> => {
  const browserWindow = await getRootWindow();
  return {
    focused: browserWindow.isFocused(),
    visible: browserWindow.isVisible(),
    maximized: browserWindow.isMaximized(),
    minimized: browserWindow.isMinimized(),
    fullscreen: browserWindow.isFullScreen(),
    normal: browserWindow.isNormal(),
    bounds: browserWindow.getNormalBounds(),
  };
};

export const setupRootWindow = (): void => {
  const unsubscribers = [
    watch(selectGlobalBadgeCount, async (globalBadgeCount) => {
      const browserWindow = await getRootWindow();

      if (browserWindow.isFocused() || globalBadgeCount === 0) {
        return;
      }

      const isShowWindowOnUnreadChangedEnabled = select(({ isShowWindowOnUnreadChangedEnabled }) => isShowWindowOnUnreadChangedEnabled);

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

      if (process.platform === 'win32') {
        browserWindow.flashFrame(true);
      }
    }),

    watch(({
      currentView,
      servers,
    }) => {
      const currentServer = typeof currentView === 'object' ? servers.find(({ url }) => url === currentView.url) : null;
      return (currentServer && currentServer.title) || app.name;
    }, async (windowTitle) => {
      const browserWindow = await getRootWindow();
      browserWindow.setTitle(windowTitle);
    }),

    listen(WEBVIEW_FOCUS_REQUESTED, async () => {
      const browserWindow = await getRootWindow();
      browserWindow.focus();
    }),
  ];

  const fetchAndDispatchWindowState = async (): Promise<void> => {
    dispatch({
      type: ROOT_WINDOW_STATE_CHANGED,
      payload: await fetchRootWindowState(),
    });
  };

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
      if (rootWindow.isFullScreen()) {
        await new Promise((resolve) => rootWindow.once('leave-full-screen', resolve));
        rootWindow.setFullScreen(false);
      }

      rootWindow.blur();

      const isTrayIconEnabled = select(({ isTrayIconEnabled }) => isTrayIconEnabled ?? true);

      if (process.platform === 'darwin' || isTrayIconEnabled) {
        rootWindow.hide();
        return;
      }

      if (process.platform === 'win32') {
        rootWindow.minimize();
        return;
      }

      app.quit();
    });

    unsubscribers.push(() => {
      rootWindow.removeAllListeners();
      rootWindow.destroy();
    });
  });

  if (process.platform === 'linux' || process.platform === 'win32') {
    const selectRootWindowIcon = createStructuredSelector<RootState, {
      globalBadge: ReturnType<typeof selectGlobalBadge>;
      rootWindowIcon: RootWindowIcon | undefined;
    }>({
      globalBadge: selectGlobalBadge,
      rootWindowIcon: ({ rootWindowIcon }) => rootWindowIcon,
    });

    unsubscribers.push(
      watch(selectRootWindowIcon, async ({ globalBadge, rootWindowIcon }) => {
        const browserWindow = await getRootWindow();

        if (!rootWindowIcon) {
          browserWindow.setIcon(getTrayIconPath({
            platform: process.platform,
            badge: globalBadge,
          }));
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
          rootWindowIcon.icon.forEach((representation) => {
            icon.addRepresentation({
              ...representation,
              scaleFactor: representation.width / 32,
            });
          });
        }

        browserWindow.setIcon(icon);

        if (process.platform === 'win32') {
          let overlayIcon: NativeImage = null;
          const overlayDescription = (typeof globalBadge === 'number' && i18next.t('unreadMention', { appName: app.name, count: globalBadge }))
          || (globalBadge === '•' && i18next.t('unreadMessage', { appName: app.name }))
          || i18next.t('noUnreadMessage', { appName: app.name });
          if (rootWindowIcon.overlay) {
            overlayIcon = nativeImage.createEmpty();

            rootWindowIcon.overlay.forEach((representation) => {
              overlayIcon.addRepresentation({
                ...representation,
                scaleFactor: 1,
              });
            });
          }

          browserWindow.setOverlayIcon(overlayIcon, overlayDescription);
        }
      }),
      watch(({ isMenuBarEnabled }) => isMenuBarEnabled, async (isMenuBarEnabled) => {
        const browserWindow = await getRootWindow();
        browserWindow.autoHideMenuBar = !isMenuBarEnabled;
        browserWindow.setMenuBarVisibility(isMenuBarEnabled);
      }),
    );
  }

  app.addListener('before-quit', () => {
    unsubscribers.forEach((unsubscriber) => unsubscriber());
  });
};

export const showRootWindow = async (): Promise<void> => {
  const browserWindow = await getRootWindow();

  browserWindow.loadFile(path.join(app.getAppPath(), 'app/index.html'));

  if (process.env.NODE_ENV === 'development') {
    setupRootWindowReload(browserWindow.webContents);
  }

  return new Promise((resolve) => {
    browserWindow.addListener('ready-to-show', () => {
      applyRootWindowState(browserWindow);
      setupRootWindow();
      resolve();
    });
  });
};

export const exportLocalStorage = async (): Promise<Record<string, string>> => {
  try {
    const tempWindow = new BrowserWindow({
      show: false,
      webPreferences,
    });

    tempWindow.loadFile(path.join(app.getAppPath(), 'app/index.html'));

    await new Promise<void>((resolve) => {
      tempWindow.addListener('ready-to-show', () => {
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
