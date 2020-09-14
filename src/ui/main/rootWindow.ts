import path from 'path';

import {
  app,
  BrowserWindow,
  screen,
  Rectangle,
} from 'electron';
import { createSelector } from 'reselect';

import { dispatch, select, watch, listen } from '../../store';
import { RootState } from '../../store/rootReducer';
import {
  ROOT_WINDOW_STATE_CHANGED,
  WEBVIEW_FOCUS_REQUESTED,
} from '../actions';
import { WindowState } from '../common';
import {
  selectGlobalBadge,
  selectGlobalBadgeCount,
} from '../selectors';
import { getTrayIconPath, getAppIconPath } from './icons';

const selectMainWindowState = ({ mainWindowState }: RootState): WindowState => mainWindowState ?? {
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

let rootWindow: BrowserWindow;

export const getRootWindow = (): BrowserWindow =>
  rootWindow;

export const createRootWindow = (): BrowserWindow => {
  rootWindow = new BrowserWindow({
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

  rootWindow.addListener('close', (event) => {
    event.preventDefault();
  });

  return rootWindow;
};

export const showRootWindow = async (rootWindow: BrowserWindow): Promise<void> => {
  rootWindow.loadFile(path.join(app.getAppPath(), 'app/index.html'));

  return new Promise((resolve) => {
    rootWindow.addListener('ready-to-show', () => {
      if (process.env.NODE_ENV === 'development') {
        rootWindow.webContents.openDevTools();
      }

      resolve();
    });
  });
};

const isInsideSomeScreen = ({ x, y, width, height }: Rectangle): boolean =>
  screen.getAllDisplays()
    .some(({ bounds }) => x >= bounds.x && y >= bounds.y
      && x + width <= bounds.x + bounds.width && y + height <= bounds.y + bounds.height,
    );

export const applyMainWindowState = (): void => {
  const rootWindowState = select(selectMainWindowState);

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

  if (rootWindow.isVisible()) {
    return;
  }

  rootWindow.setBounds({ x, y, width, height });

  if (rootWindowState.maximized) {
    rootWindow.maximize();
  }

  if (rootWindowState.minimized) {
    rootWindow.minimize();
  }

  if (rootWindowState.fullscreen) {
    rootWindow.setFullScreen(true);
  }

  if (rootWindowState.visible) {
    rootWindow.show();
  }

  if (rootWindowState.focused) {
    rootWindow.focus();
  }
};

const fetchRootWindowState = (): ReturnType<typeof selectMainWindowState> => ({
  focused: rootWindow.isFocused(),
  visible: rootWindow.isVisible(),
  maximized: rootWindow.isMaximized(),
  minimized: rootWindow.isMinimized(),
  fullscreen: rootWindow.isFullScreen(),
  normal: rootWindow.isNormal(),
  bounds: rootWindow.getNormalBounds(),
});

export const setupRootWindow = (): void => {
  if (process.platform === 'linux' || process.platform === 'win32') {
    watch(({ isMenuBarEnabled }) => isMenuBarEnabled, (isMenuBarEnabled) => {
      rootWindow.autoHideMenuBar = !isMenuBarEnabled;
      rootWindow.setMenuBarVisibility(isMenuBarEnabled);
    });

    const selectRootWindowIcon = createSelector([
      ({ isTrayIconEnabled }) => isTrayIconEnabled ?? true,
      selectGlobalBadge,
    ], (isTrayIconEnabled, globalBadge) => [isTrayIconEnabled, globalBadge]);

    watch(selectRootWindowIcon, ([isTrayIconEnabled, globalBadge]) => {
      const icon = isTrayIconEnabled ? getTrayIconPath({ badge: globalBadge }) : getAppIconPath();
      rootWindow.setIcon(icon);
    });
  }

  watch(selectGlobalBadgeCount, (globalBadgeCount) => {
    if (rootWindow.isFocused() || globalBadgeCount === 0) {
      return;
    }

    const isShowWindowOnUnreadChangedEnabled = select(({ isShowWindowOnUnreadChangedEnabled }) => isShowWindowOnUnreadChangedEnabled);

    if (isShowWindowOnUnreadChangedEnabled) {
      rootWindow.showInactive();
      return;
    }

    if (process.platform === 'win32') {
      rootWindow.flashFrame(true);
    }
  });

  watch(({
    servers,
    currentServerUrl,
  }) => {
    const currentServer = servers.find(({ url }) => url === currentServerUrl);
    return (currentServer && currentServer.title) || app.name;
  }, (windowTitle) => {
    rootWindow.setTitle(windowTitle);
  });

  const fetchAndDispatchWindowState = (): void => {
    dispatch({
      type: ROOT_WINDOW_STATE_CHANGED,
      payload: fetchRootWindowState(),
    });
  };

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

  rootWindow.addListener('focus', () => {
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

    rootWindow.destroy();
  });

  listen(WEBVIEW_FOCUS_REQUESTED, () => {
    rootWindow.focus();
  });
};
