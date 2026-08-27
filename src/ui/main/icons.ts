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

// All three platforms show STATUS only in the tray icon — the Windows
// taskbar overlay, the macOS menu-bar title, and the Linux tray tooltip
// already show the unread count. There is no "unread + presence unknown"
// fallback asset on any platform: when presence is unknown the icon is
// always the default/disconnected icon, regardless of `badge`, so `badge`
// is ignored entirely.
const getMacOSTrayIconPath = (
  _badge: Server['badge'],
  presence: UserPresence | undefined,
  disconnected: boolean | undefined
): string => {
  if (disconnected) {
    return path.join(
      app.getAppPath(),
      'app/images/tray/darwin/disconnected.png'
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
  _badge: Server['badge'],
  presence: UserPresence | undefined,
  disconnected: boolean | undefined
): string => {
  if (disconnected) {
    return path.join(
      app.getAppPath(),
      'app/images/tray/win32/disconnected.ico'
    );
  }

  const name = presence ? `presence-${presence}` : 'default';
  return path.join(app.getAppPath(), `app/images/tray/win32/${name}.ico`);
};

const getLinuxTrayIconPath = (
  _badge: Server['badge'],
  presence: UserPresence | undefined,
  disconnected: boolean | undefined
): string => {
  if (disconnected) {
    return path.join(
      app.getAppPath(),
      'app/images/tray/linux/disconnected.png'
    );
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
  platform,
}: {
  badge?: Server['badge'];
  presence?: UserPresence;
  disconnected?: boolean;
  platform: NodeJS.Platform;
}): string => {
  switch (platform ?? process.platform) {
    case 'darwin':
      return getMacOSTrayIconPath(badge, presence, disconnected);

    case 'win32':
      return getWindowsTrayIconPath(badge, presence, disconnected);

    case 'linux':
      return getLinuxTrayIconPath(badge, presence, disconnected);

    default:
      throw Error(`unsupported platform (${platform})`);
  }
};
