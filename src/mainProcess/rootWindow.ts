import {
  app,
  BrowserWindow,
  nativeImage,
  screen,
  Rectangle,
  NativeImage,
} from 'electron';
import i18next from 'i18next';
import { createStructuredSelector } from 'reselect';

import * as rootWindowActions from '../common/actions/rootWindowActions';
import {
  selectGlobalBadge,
  selectGlobalBadgeCount,
} from '../common/badgeSelectors';
import { dispatch, select, watch } from '../common/store';
import type { RootState } from '../common/types/RootState';
import type { RootWindowIcon } from '../common/types/RootWindowIcon';
import type { Server } from '../common/types/Server';
import type { WindowState } from '../common/types/WindowState';
import { setupRootWindowReload } from './dev';
import { getTrayIconPath } from './icons';
import { joinAsarPath } from './joinAsarPath';

const selectRootWindowState = ({
  ui: {
    rootWindow: { state },
  },
}: RootState): WindowState =>
  state ?? {
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
      _rootWindow ? resolve(_rootWindow) : reject(new Error());
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
    webPreferences: {
      nodeIntegration: true,
      nodeIntegrationInSubFrames: true,
      webviewTag: true,
      worldSafeExecuteJavaScript: true,
    },
  });

  _rootWindow.addListener('close', (event) => {
    event.preventDefault();
  });
};

const isInsideSomeScreen = ({ x, y, width, height }: Rectangle): boolean =>
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
  const isTrayIconEnabled = select((state) => state.ui.trayIcon.enabled);

  let { x, y } = rootWindowState.bounds;
  const { width, height } = rootWindowState.bounds;
  if (
    x === null ||
    x === undefined ||
    y === null ||
    y === undefined ||
    !isInsideSomeScreen({ x, y, width, height })
  ) {
    const {
      bounds: { width: primaryDisplayWidth, height: primaryDisplayHeight },
    } = screen.getPrimaryDisplay();
    x = Math.round((primaryDisplayWidth - width) / 2);
    y = Math.round((primaryDisplayHeight - height) / 2);
  }

  if (browserWindow.isVisible()) {
    return;
  }

  if (x === null || x === undefined || y === null || y === undefined) {
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

const fetchRootWindowState = async (): Promise<
  ReturnType<typeof selectRootWindowState>
> => {
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

      const isShowWindowOnUnreadChangedEnabled = select(
        (state) => state.ui.rootWindow.showOnBadgeChange
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

      browserWindow.flashFrame(true);
    }),

    watch(
      ({ servers, ui: { view } }) => {
        const currentServer =
          typeof view === 'object'
            ? servers.find(({ url }) => url === view.url)
            : null;
        return (currentServer && currentServer.title) || app.name;
      },
      async (windowTitle) => {
        const browserWindow = await getRootWindow();
        browserWindow.setTitle(windowTitle);
      }
    ),
  ];

  const fetchAndDispatchWindowState = async (): Promise<void> => {
    dispatch(rootWindowActions.stateChanged(await fetchRootWindowState()));
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
        await new Promise((resolve) =>
          rootWindow.once('leave-full-screen', resolve)
        );
        rootWindow.setFullScreen(false);
      }

      rootWindow.blur();

      const isTrayIconEnabled = select(
        (state) => state.ui.trayIcon.enabled ?? true
      );

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
    const selectRootWindowIcon = createStructuredSelector<
      RootState,
      {
        globalBadge: Server['badge'];
        rootWindowIcon: RootWindowIcon | undefined;
      }
    >({
      globalBadge: selectGlobalBadge,
      rootWindowIcon: (state) => state.ui.rootWindow.icon,
    });

    unsubscribers.push(
      watch(selectRootWindowIcon, async ({ globalBadge, rootWindowIcon }) => {
        const browserWindow = await getRootWindow();

        if (!rootWindowIcon) {
          browserWindow.setIcon(
            getTrayIconPath({
              platform: process.platform,
              badge: globalBadge,
            })
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

          browserWindow.setOverlayIcon(overlayIcon, overlayDescription);
        }
      }),
      watch(
        (state) => state.ui.menuBar.enabled,
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

  app.addListener('activate', async () => {
    dispatch(rootWindowActions.focused());
  });

  app.addListener('window-all-closed', (): void => undefined);
};

export const showRootWindow = async (): Promise<void> => {
  const browserWindow = await getRootWindow();

  browserWindow.loadFile(joinAsarPath('index.html'));

  if (process.env.NODE_ENV === 'development') {
    setupRootWindowReload(browserWindow.webContents);
  }

  return new Promise((resolve) => {
    browserWindow.addListener('ready-to-show', () => {
      applyRootWindowState(browserWindow);

      const isTrayIconEnabled = select((state) => state.ui.trayIcon.enabled);

      if (app.commandLine.hasSwitch('start-hidden') && isTrayIconEnabled) {
        console.debug('Start application in background');
        browserWindow.hide();
      }

      setupRootWindow();
      resolve();
    });
  });
};
