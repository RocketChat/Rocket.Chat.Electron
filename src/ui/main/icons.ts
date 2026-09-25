import path from 'path';

import { app } from 'electron';

import type { Server, UserPresence } from '../../servers/common';

export const getAppIconPath = ({
  platform,
}: {
  platform: NodeJS.Platform;
}): string => {
  if (platform !== 'win32') {
    throw Error('only win32 platform is supported');
  }

  return `${app.getAppPath()}/app/images/icon.ico`;
};

// By default all three platforms show STATUS only in the tray icon — the
// Windows taskbar overlay, the macOS menu-bar title and the Linux tray tooltip
// carry the unread count, so `badge` is ignored. With the unread counter tray
// icon setting on, `badge` picks the pre-4.17 notification artwork instead and
// presence is not shown. Disconnected wins in both modes.
const getBadgeAssetSuffix = (badge: Server['badge']): string =>
  (badge === '•' && 'dot') ||
  (typeof badge === 'number' && badge > 9 && 'plus-9') ||
  String(badge);

const getMacOSTrayIconPath = (
  badge: Server['badge'],
  presence: UserPresence | undefined,
  disconnected: boolean | undefined,
  showUnreadCounter: boolean | undefined
): string => {
  if (disconnected) {
    return path.join(
      app.getAppPath(),
      'app/images/tray/darwin/disconnected.png'
    );
  }

  if (showUnreadCounter) {
    return path.join(
      app.getAppPath(),
      `app/images/tray/darwin/${badge ? 'notification' : 'default'}Template.png`
    );
  }

  if (!presence) {
    return path.join(
      app.getAppPath(),
      'app/images/tray/darwin/defaultTemplate.png'
    );
  }

  return path.join(
    app.getAppPath(),
    `app/images/tray/darwin/presence-${presence}.png`
  );
};

const getWindowsTrayIconPath = (
  badge: Server['badge'],
  presence: UserPresence | undefined,
  disconnected: boolean | undefined,
  showUnreadCounter: boolean | undefined
): string => {
  if (disconnected) {
    return path.join(
      app.getAppPath(),
      'app/images/tray/win32/disconnected.ico'
    );
  }

  if (showUnreadCounter) {
    const name = badge
      ? `notification-${getBadgeAssetSuffix(badge)}`
      : 'default';
    return path.join(app.getAppPath(), `app/images/tray/win32/${name}.ico`);
  }

  const name = presence ? `presence-${presence}` : 'default';
  return path.join(app.getAppPath(), `app/images/tray/win32/${name}.ico`);
};

const getLinuxTrayIconPath = (
  badge: Server['badge'],
  presence: UserPresence | undefined,
  disconnected: boolean | undefined,
  showUnreadCounter: boolean | undefined
): string => {
  if (disconnected) {
    return path.join(
      app.getAppPath(),
      'app/images/tray/linux/disconnected.png'
    );
  }

  if (showUnreadCounter) {
    const name = badge
      ? `notification-${getBadgeAssetSuffix(badge)}`
      : 'default';
    return path.join(app.getAppPath(), `app/images/tray/linux/${name}.png`);
  }

  const name = presence ? `presence-${presence}` : 'default';
  return path.join(app.getAppPath(), `app/images/tray/linux/${name}.png`);
};

export const getPresenceMenuIconPath = (presence: UserPresence): string =>
  path.join(app.getAppPath(), `app/images/presence/${presence}.png`);

export const getTrayIconPath = ({
  badge,
  presence,
  disconnected,
  showUnreadCounter,
  platform,
}: {
  badge?: Server['badge'];
  presence?: UserPresence;
  disconnected?: boolean;
  showUnreadCounter?: boolean;
  platform: NodeJS.Platform;
}): string => {
  switch (platform ?? process.platform) {
    case 'darwin':
      return getMacOSTrayIconPath(
        badge,
        presence,
        disconnected,
        showUnreadCounter
      );

    case 'win32':
      return getWindowsTrayIconPath(
        badge,
        presence,
        disconnected,
        showUnreadCounter
      );

    case 'linux':
      return getLinuxTrayIconPath(
        badge,
        presence,
        disconnected,
        showUnreadCounter
      );

    default:
      throw Error(`unsupported platform (${platform})`);
  }
};
