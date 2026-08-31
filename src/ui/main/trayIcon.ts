import type { MenuItemConstructorOptions } from 'electron';
import { app, Menu, nativeImage, Tray, webContents } from 'electron';
import i18next from 'i18next';

import { loggers } from '../../logging/scopes';
import type { Server, UserPresence } from '../../servers/common';
import { watch, select, Service, dispatch } from '../../store';
import type { RootState } from '../../store/rootReducer';
import { SET_HAS_TRAY_MINIMIZE_NOTIFICATION_SHOWN } from '../actions';
import type { ActiveServerPresence } from '../selectors';
import { selectGlobalBadge, selectActiveServerPresence } from '../selectors';
import {
  getTrayIconPath,
  getAppIconPath,
  getPresenceMenuIconPath,
} from './icons';
import { applyMacOSMenuBarGlyphAppearance } from './macOSTrayGlyph';
import { getRootWindow } from './rootWindow';

const t = i18next.t.bind(i18next);

const PRESENCE_CHANGE_REQUESTED_CHANNEL = 'presence/change-requested';

const selectIsRootWindowVisible = ({
  rootWindowState: { visible },
}: RootState): boolean => visible;

const selectHasHideOnTrayNotificationShown = ({
  hasHideOnTrayNotificationShown,
}: RootState): boolean => hasHideOnTrayNotificationShown;

const requestPresenceChange = (
  activeServerPresence: ActiveServerPresence,
  presence: UserPresence
): void => {
  const server = select(({ servers }: RootState): Server | undefined =>
    servers.find((s) => s.url === activeServerPresence.url)
  );

  if (!server?.webContentsId) {
    return;
  }

  const targetWebContents = webContents.fromId(server.webContentsId);
  targetWebContents?.send(PRESENCE_CHANGE_REQUESTED_CHANNEL, presence);
};

const showRootWindow = async (): Promise<void> => {
  try {
    const browserWindow = await getRootWindow();
    browserWindow.show();
  } catch (error) {
    loggers.ui.error(
      'Failed to show the root window from the tray menu',
      error
    );
  }
};

const PRESENCE_OPTIONS: { presence: UserPresence; labelKey: string }[] = [
  { presence: 'online', labelKey: 'tray.presence.online' },
  { presence: 'away', labelKey: 'tray.presence.away' },
  { presence: 'busy', labelKey: 'tray.presence.busy' },
  { presence: 'offline', labelKey: 'tray.presence.offline' },
];

const buildPresenceMenuItems = (
  activeServerPresence: ActiveServerPresence
): MenuItemConstructorOptions[] => {
  const {
    url,
    title,
    presence,
    statusText,
    connection,
    supported,
    loggedIn,
    failed,
    hasServers,
    isAddingServer,
  } = activeServerPresence;

  if (!hasServers || isAddingServer) {
    return [
      {
        label: t('tray.presence.addWorkspace'),
        enabled: true,
        click: () => {
          showRootWindow();
        },
      },
    ];
  }

  if (!url) {
    return [];
  }

  if (!loggedIn) {
    return [
      {
        label: t('tray.presence.signIn', { workspace: title ?? url }),
        enabled: true,
        click: () => {
          showRootWindow();
        },
      },
    ];
  }

  if (supported === false || failed) {
    return [];
  }

  const isDisconnected =
    connection === 'disconnected' || connection === 'connecting';
  const isConnected = !isDisconnected;

  const submenu: MenuItemConstructorOptions[] = PRESENCE_OPTIONS.map(
    ({ presence: optionPresence, labelKey }) => ({
      label: t(labelKey),
      icon: nativeImage.createFromPath(getPresenceMenuIconPath(optionPresence)),
      type: 'radio',
      checked: presence === optionPresence,
      enabled: isConnected,
      click: () => {
        requestPresenceChange(activeServerPresence, optionPresence);
      },
    })
  );

  const currentOption = PRESENCE_OPTIONS.find(
    (option) => option.presence === presence
  );

  const items: MenuItemConstructorOptions[] = [
    {
      label: currentOption
        ? t(currentOption.labelKey)
        : t('tray.presence.status'),
      ...(currentOption && {
        icon: nativeImage.createFromPath(
          getPresenceMenuIconPath(currentOption.presence)
        ),
      }),
      submenu,
    },
  ];

  if (!isConnected) {
    items.push({
      label: t('tray.presence.disconnected'),
      enabled: false,
    });
  }

  if (statusText) {
    items.push({
      label: statusText,
      enabled: false,
    });
  }

  return items;
};

export const buildMenuTemplate = (state: {
  isRootWindowVisible: boolean;
  activeServerPresence: ActiveServerPresence;
}): MenuItemConstructorOptions[] => {
  const { isRootWindowVisible, activeServerPresence } = state;

  const presenceItems = buildPresenceMenuItems(activeServerPresence);

  return [
    ...presenceItems,
    ...(presenceItems.length > 0 ? [{ type: 'separator' as const }] : []),
    {
      label: isRootWindowVisible ? t('tray.menu.hide') : t('tray.menu.show'),
      click: async () => {
        try {
          const isRootWindowVisible = select(selectIsRootWindowVisible);
          const browserWindow = await getRootWindow();

          if (isRootWindowVisible) {
            browserWindow.hide();
            return;
          }

          browserWindow.show();
        } catch (error) {
          loggers.ui.error(
            'Failed to toggle the root window from the tray menu',
            error
          );
        }
      },
    },
    {
      label: t('tray.menu.quit'),
      click: () => {
        app.quit();
      },
    },
  ];
};

const createTrayIcon = (): Tray => {
  const image = getTrayIconPath({
    platform: process.platform,
    badge: undefined,
  });

  const trayIcon = new Tray(nativeImage.createEmpty());

  if (process.platform !== 'darwin') {
    trayIcon.addListener('click', async () => {
      try {
        const isRootWindowVisible = select(selectIsRootWindowVisible);
        const browserWindow = await getRootWindow();

        if (isRootWindowVisible) {
          browserWindow.hide();
          return;
        }

        browserWindow.show();
      } catch (error) {
        loggers.ui.error(
          'Failed to toggle the root window from the tray icon click',
          error
        );
      }
    });
  }

  trayIcon.addListener('balloon-click', async () => {
    try {
      const isRootWindowVisible = select(selectIsRootWindowVisible);
      const browserWindow = await getRootWindow();

      if (isRootWindowVisible) {
        browserWindow.hide();
        return;
      }

      browserWindow.show();
    } catch (error) {
      loggers.ui.error(
        'Failed to toggle the root window from the tray balloon click',
        error
      );
    }
  });

  trayIcon.addListener('right-click', (_event, bounds) => {
    trayIcon.popUpContextMenu(undefined, bounds);
  });

  trayIcon.setImage(nativeImage.createFromPath(image));

  return trayIcon;
};

const loadTrayImage = (
  badge: Server['badge'],
  presence: UserPresence | undefined,
  disconnected: boolean
): ReturnType<typeof nativeImage.createFromPath> => {
  const imagePath = getTrayIconPath({
    platform: process.platform,
    badge,
    presence,
    disconnected,
  });
  const image = nativeImage.createFromPath(imagePath);

  if (process.platform === 'darwin' && (presence || disconnected)) {
    return applyMacOSMenuBarGlyphAppearance(image);
  }

  return image;
};

const updateTrayIconImage = (
  trayIcon: Tray,
  badge: Server['badge'],
  presence: UserPresence | undefined,
  disconnected: boolean
): void => {
  trayIcon.setImage(loadTrayImage(badge, presence, disconnected));
};

const updateTrayIconTitle = (
  trayIcon: Tray,
  globalBadge: Server['badge']
): void => {
  const title = Number.isInteger(globalBadge) ? String(globalBadge) : '';
  trayIcon.setTitle(title);
};

const updateTrayIconToolTip = (
  trayIcon: Tray,
  globalBadge: Server['badge']
): void => {
  if (globalBadge === '•') {
    trayIcon.setToolTip(t('tray.tooltip.unreadMessage', { appName: app.name }));
    return;
  }

  if (Number.isInteger(globalBadge)) {
    trayIcon.setToolTip(
      t('tray.tooltip.unreadMention', { appName: app.name, count: globalBadge })
    );
    return;
  }

  trayIcon.setToolTip(t('tray.tooltip.noUnreadMessage', { appName: app.name }));
};

const warnStillRunning = (trayIcon: Tray): void => {
  if (process.platform !== 'win32') {
    return;
  }

  const hasHideOnTrayNotificationShown = select(
    selectHasHideOnTrayNotificationShown
  );

  if (!hasHideOnTrayNotificationShown) {
    trayIcon.displayBalloon({
      icon: getAppIconPath({ platform: process.platform }),
      title: t('tray.balloon.stillRunning.title', { appName: app.name }),
      content: t('tray.balloon.stillRunning.content', { appName: app.name }),
    });
    dispatch({
      type: SET_HAS_TRAY_MINIMIZE_NOTIFICATION_SHOWN,
      payload: true,
    });
  }
};

const getActivePresenceForIcon = (
  activeServerPresence: ActiveServerPresence
): UserPresence | undefined => {
  if (!activeServerPresence.url || activeServerPresence.supported === false) {
    return undefined;
  }

  return activeServerPresence.presence;
};

// Mirrors `buildPresenceMenuItems`'s `isDisconnected` predicate so the tray
// icon and the tray menu always agree on whether the workspace is reachable.
// No-url / unsupported / logged-out states win over this — those already
// return `undefined` from `getActivePresenceForIcon` and keep showing the
// base icon, matching the menu, which hides presence options entirely for
// those same states.
const isDisconnectedForIcon = (
  activeServerPresence: ActiveServerPresence
): boolean => {
  if (
    !activeServerPresence.url ||
    activeServerPresence.supported === false ||
    !activeServerPresence.loggedIn
  ) {
    return false;
  }

  return (
    activeServerPresence.connection === 'disconnected' ||
    activeServerPresence.connection === 'connecting'
  );
};

const manageTrayIcon = async (): Promise<() => void> => {
  const trayIcon = createTrayIcon();

  let firstTrayIconBalloonShown = false;

  const refreshMenu = (
    isRootWindowVisible: boolean,
    prevIsRootWindowVisible: boolean | undefined
  ): void => {
    const activeServerPresence = select(selectActiveServerPresence);
    const menuTemplate = buildMenuTemplate({
      isRootWindowVisible,
      activeServerPresence,
    });

    const menu = Menu.buildFromTemplate(menuTemplate);
    trayIcon.setContextMenu(menu);

    if (
      prevIsRootWindowVisible &&
      !isRootWindowVisible &&
      process.platform === 'win32' &&
      !firstTrayIconBalloonShown
    ) {
      warnStillRunning(trayIcon);
      firstTrayIconBalloonShown = true;
    }
  };

  const unwatchGlobalBadge = watch(selectGlobalBadge, (globalBadge) => {
    const activeServerPresence = select(selectActiveServerPresence);
    updateTrayIconImage(
      trayIcon,
      globalBadge,
      getActivePresenceForIcon(activeServerPresence),
      isDisconnectedForIcon(activeServerPresence)
    );
    updateTrayIconTitle(trayIcon, globalBadge);
    updateTrayIconToolTip(trayIcon, globalBadge);
  });

  const unwatchIsRootWindowVisible = watch(
    selectIsRootWindowVisible,
    (isRootWindowVisible, prevIsRootWindowVisible) => {
      refreshMenu(isRootWindowVisible, prevIsRootWindowVisible);
    }
  );

  const unwatchActiveServerPresence = watch(
    selectActiveServerPresence,
    (activeServerPresence) => {
      const isRootWindowVisible = select(selectIsRootWindowVisible);
      refreshMenu(isRootWindowVisible, isRootWindowVisible);

      const globalBadge = select(selectGlobalBadge);
      updateTrayIconImage(
        trayIcon,
        globalBadge,
        getActivePresenceForIcon(activeServerPresence),
        isDisconnectedForIcon(activeServerPresence)
      );
    }
  );

  return () => {
    unwatchGlobalBadge();
    unwatchIsRootWindowVisible();
    unwatchActiveServerPresence();
    trayIcon.destroy();
  };
};

class TrayIconService extends Service {
  private tearDownPromise: Promise<() => void> | null = null;

  protected initialize(): void {
    this.watch(
      ({ isTrayIconEnabled }) => isTrayIconEnabled ?? true,
      (isTrayIconEnabled) => {
        if (!this.tearDownPromise && isTrayIconEnabled) {
          this.tearDownPromise = manageTrayIcon();
        } else if (this.tearDownPromise && !isTrayIconEnabled) {
          this.tearDownPromise.then((cleanUp) => cleanUp());
          this.tearDownPromise = null;
        }
      }
    );
  }

  protected destroy(): void {
    this.tearDownPromise?.then((cleanUp) => cleanUp());
    this.tearDownPromise = null;
  }
}

export default new TrayIconService();
