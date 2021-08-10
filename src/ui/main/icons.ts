import path from 'path';

import { app } from 'electron';

import { Server } from '../../servers/common';

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

const getMacOSTrayIconPath = (badge: Server['badge']): string =>
  path.join(
    app.getAppPath(),
    `app/images/tray/darwin/${badge ? 'notification' : 'default'}Template.png`
  );

const getWindowsTrayIconPath = (badge: Server['badge']): string => {
  const name =
    (!badge && 'default') ||
    (badge === '•' && 'notification-dot') ||
    (typeof badge === 'number' && badge > 9 && 'notification-plus-9') ||
    `notification-${badge}`;
  return path.join(app.getAppPath(), `app/images/tray/win32/${name}.ico`);
};

const getLinuxTrayIconPath = (badge: Server['badge']): string => {
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
}: {
  badge?: Server['badge'];
  platform: NodeJS.Platform;
}): string => {
  switch (platform ?? process.platform) {
    case 'darwin':
      return getMacOSTrayIconPath(badge);

    case 'win32':
      return getWindowsTrayIconPath(badge);

    case 'linux':
      return getLinuxTrayIconPath(badge);

    default:
      throw Error(`unsupported platform (${platform})`);
  }
};
