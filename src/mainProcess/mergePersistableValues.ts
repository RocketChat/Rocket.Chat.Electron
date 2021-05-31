import { selectPersistableValues } from '../common/selectPersistableValues';
import type { RootState } from '../common/types/RootState';
import { extractPersistableValues } from './extractPersistableValues';
import { getPersistedValues } from './getPersistedValues';
import { joinUserPath } from './joinUserPath';
import { readJsonObject } from './readJsonObject';

export const mergePersistableValues = async (
  state: RootState,
  localStorage: Record<string, string>
): Promise<RootState> => {
  const initialValues = selectPersistableValues(state);

  const electronStoreValues = getPersistedValues();

  const localStorageValues = Object.fromEntries(
    Object.entries(localStorage).map(([key, value]) => {
      try {
        return [key, JSON.parse(value)];
      } catch (error) {
        return [];
      }
    })
  ) as Record<string, unknown>;

  let values = extractPersistableValues({
    ...initialValues,
    ...electronStoreValues,
    ...localStorageValues,
  });

  if (localStorage.autohideMenu) {
    values = {
      ...values,
      isMenuBarEnabled: localStorage.autohideMenu !== 'true',
    };
  }

  if (localStorage.showWindowOnUnreadChanged) {
    values = {
      ...values,
      isShowWindowOnUnreadChangedEnabled:
        localStorage.showWindowOnUnreadChanged === 'true',
    };
  }

  if (localStorage['sidebar-closed']) {
    values = {
      ...values,
      isSideBarEnabled: localStorage['sidebar-closed'] !== 'true',
    };
  }

  if (localStorage.hideTray) {
    values = {
      ...values,
      isTrayIconEnabled: localStorage.hideTray !== 'true',
    };
  }

  const filePath = joinUserPath('main-window-state.json');
  const userRootWindowState = await readJsonObject(filePath, { discard: true });

  values = {
    ...values,
    rootWindowState: {
      ...values.rootWindowState,
      focused: true,
      ...(typeof userRootWindowState.isHidden === 'boolean' && {
        visible: !userRootWindowState.isHidden,
      }),
      ...(typeof userRootWindowState.isMaximized === 'boolean' && {
        maximized: userRootWindowState.isMaximized,
      }),
      ...(typeof userRootWindowState.isMinimized === 'boolean' && {
        minimized: userRootWindowState.isMinimized,
      }),
      fullscreen: false,
      ...(!userRootWindowState.isMinimized &&
        !userRootWindowState.isMaximized && {
          normal: true,
        }),
      bounds: {
        ...values.rootWindowState.bounds,
        ...(typeof userRootWindowState.x === 'number' && {
          x: userRootWindowState.x,
        }),
        ...(typeof userRootWindowState.y === 'number' && {
          y: userRootWindowState.y,
        }),
        ...(typeof userRootWindowState.width === 'number' && {
          width: userRootWindowState.width,
        }),
        ...(typeof userRootWindowState.height === 'number' && {
          height: userRootWindowState.height,
        }),
      },
    },
  };

  return {
    ...state,
    navigation: {
      ...state.navigation,
      externalProtocols: values.externalProtocols,
      trustedCertificates: values.trustedCertificates,
    },
    updates: {
      ...state.updates,
      settings: {
        ...state.updates.settings,
        editable: values.isEachUpdatesSettingConfigurable,
        enabled: values.isUpdatingEnabled,
        checkOnStartup: values.doCheckForUpdatesOnStartup,
        skippedVersion: values.skippedUpdateVersion,
      },
    },
    ui: {
      ...state.ui,
      menuBar: {
        ...state.ui.menuBar,
        enabled: values.isMenuBarEnabled,
      },
      rootWindow: {
        ...state.ui.rootWindow,
        state: values.rootWindowState,
        showOnBadgeChange: values.isShowWindowOnUnreadChangedEnabled,
      },
      sideBar: {
        ...state.ui.sideBar,
        enabled: state.ui.sideBar.enabled,
      },
      trayIcon: {
        ...state.ui.trayIcon,
        enabled: values.isTrayIconEnabled,
      },
      view: values.currentView,
    },
    downloads: values.downloads,
    servers: values.servers.map(({ webContentsId: _, ...server }) => server),
  };
};
