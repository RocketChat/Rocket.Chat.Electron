import { app, Menu, nativeImage, Tray } from 'electron';
import i18next from 'i18next';

import { Server } from '../../servers/common';
import { watch, select, Service, dispatch } from '../../store';
import { RootState } from '../../store/rootReducer';
import { SET_HAS_TRAY_MINIMIZE_NOTIFICATION_SHOWN } from '../actions';
import { selectGlobalBadge } from '../selectors';
import { getTrayIconPath, getAppIconPath } from './icons';
import { getRootWindow } from './rootWindow';

const t = i18next.t.bind(i18next);

const selectIsRootWindowVisible = ({
  rootWindowState: { visible },
}: RootState): boolean => visible;

const selectHasHideOnTrayNotificationShown = ({
  hasHideOnTrayNotificationShown,
}: RootState): boolean => hasHideOnTrayNotificationShown;

const createTrayIcon = (): Tray => {
  const image = getTrayIconPath({
    platform: process.platform,
    badge: undefined,
  });

  const trayIcon = new Tray(nativeImage.createEmpty());

  if (process.platform !== 'darwin') {
    trayIcon.addListener('click', async () => {
      const isRootWindowVisible = select(selectIsRootWindowVisible);
      const browserWindow = await getRootWindow();

      if (isRootWindowVisible) {
        browserWindow.hide();
        return;
      }

      browserWindow.show();
    });
  }

  trayIcon.addListener('balloon-click', async () => {
    const isRootWindowVisible = select(selectIsRootWindowVisible);
    const browserWindow = await getRootWindow();

    if (isRootWindowVisible) {
      browserWindow.hide();
      return;
    }

    browserWindow.show();
  });

  trayIcon.addListener('right-click', (_event, bounds) => {
    trayIcon.popUpContextMenu(undefined, bounds);
  });

  trayIcon.setImage(nativeImage.createFromPath(image));

  return trayIcon;
};

const updateTrayIconImage = (trayIcon: Tray, badge: Server['badge']): void => {
  const image = getTrayIconPath({
    platform: process.platform,
    badge,
  });
  trayIcon.setImage(nativeImage.createFromPath(image));
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

const manageTrayIcon = async (): Promise<() => void> => {
  const trayIcon = createTrayIcon();

  const unwatchGlobalBadge = watch(selectGlobalBadge, (globalBadge) => {
    updateTrayIconImage(trayIcon, globalBadge);
    updateTrayIconTitle(trayIcon, globalBadge);
    updateTrayIconToolTip(trayIcon, globalBadge);
  });

  let firstTrayIconBalloonShown = false;

  const unwatchIsRootWindowVisible = watch(
    selectIsRootWindowVisible,
    (isRootWindowVisible, prevIsRootWindowVisible) => {
      const menuTemplate = [
        {
          label: isRootWindowVisible
            ? t('tray.menu.hide')
            : t('tray.menu.show'),
          click: async () => {
            const isRootWindowVisible = select(selectIsRootWindowVisible);
            const browserWindow = await getRootWindow();

            if (isRootWindowVisible) {
              browserWindow.hide();
              return;
            }

            browserWindow.show();
          },
        },
        {
          label: t('tray.menu.quit'),
          click: () => {
            app.quit();
          },
        },
      ];

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
    }
  );

  return () => {
    unwatchGlobalBadge();
    unwatchIsRootWindowVisible();
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
