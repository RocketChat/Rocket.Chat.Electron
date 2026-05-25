import path from 'path';

import { app } from 'electron';

import type { Server } from '../../servers/common';

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

const getMacOSTrayIconPath = (
  badge: Server['badge'],
  isLoggedIn: boolean
): string => {
  if (!isLoggedIn) {
    return path.join(app.getAppPath(), 'app/images/tray/darwin/offline.png');
  }

  return path.join(
    app.getAppPath(),
    `app/images/tray/darwin/${badge ? 'notification' : 'default'}Template.png`
  );
}

const getWindowsTrayIconPath = (
  badge: Server['badge'],
  isLoggedIn: boolean
): string => {
  if (!isLoggedIn) {
    return path.join(app.getAppPath(), 'app/images/tray/win32/offline.ico');
  }

  const name =
    (!badge && 'default') ||
    (badge === '•' && 'notification-dot') ||
    (typeof badge === 'number' && badge > 9 && 'notification-plus-9') ||
    `notification-${badge}`;
  return path.join(app.getAppPath(), `app/images/tray/win32/${name}.ico`);
};

const getLinuxTrayIconPath = (
  badge: Server['badge'],
  isLoggedIn: boolean
): string => {
  if (!isLoggedIn) {
    return path.join(app.getAppPath(), 'app/images/tray/linux/offline.png');
  }

  const name =
    (!badge && 'default') ||
    (badge === '•' && 'notification-dot') ||
    (typeof badge === 'number' && badge > 9 && 'notification-plus-9') ||
    `notification-${badge}`;
  return path.join(app.getAppPath(), `app/images/tray/linux/${name}.png`);
};

export const getTrayIconPath = ({
  badge,
  platform,
  isLoggedIn = false,
}: {
  badge?: Server['badge'];
  platform: NodeJS.Platform;
  isLoggedIn?: boolean;
}): string => {
  switch (platform ?? process.platform) {
    case 'darwin':
      return getMacOSTrayIconPath(badge, isLoggedIn);

    case 'win32':
      return getWindowsTrayIconPath(badge, isLoggedIn);

    case 'linux':
      return getLinuxTrayIconPath(badge, isLoggedIn);

    default:
      throw Error(`unsupported platform (${platform})`);
  }
};
