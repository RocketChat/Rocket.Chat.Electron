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

const getBadgeNamePart = (badge: Server['badge']): string =>
  (badge === '•' && 'notification-dot') ||
  (typeof badge === 'number' && badge > 9 && 'notification-plus-9') ||
  `notification-${badge}`;

const getMacOSTrayIconPath = (
  badge: Server['badge'],
  presence: UserPresence | undefined
): string => {
  if (!presence) {
    return path.join(
      app.getAppPath(),
      `app/images/tray/darwin/${badge ? 'notification' : 'default'}Template.png`
    );
  }

  const name = `presence-${presence}${badge ? `-${getBadgeNamePart(badge)}` : ''}`;
  return path.join(app.getAppPath(), `app/images/tray/darwin/${name}.png`);
};

const getWindowsTrayIconPath = (
  badge: Server['badge'],
  presence: UserPresence | undefined
): string => {
  const name = presence
    ? `presence-${presence}${badge ? `-${getBadgeNamePart(badge)}` : ''}`
    : (!badge && 'default') || getBadgeNamePart(badge);
  return path.join(app.getAppPath(), `app/images/tray/win32/${name}.ico`);
};

const getLinuxTrayIconPath = (
  badge: Server['badge'],
  presence: UserPresence | undefined
): string => {
  const name = presence
    ? `presence-${presence}${badge ? `-${getBadgeNamePart(badge)}` : ''}`
    : (!badge && 'default') || getBadgeNamePart(badge);
  return path.join(app.getAppPath(), `app/images/tray/linux/${name}.png`);
};

export const getTrayIconPath = ({
  badge,
  presence,
  platform,
}: {
  badge?: Server['badge'];
  presence?: UserPresence;
  platform: NodeJS.Platform;
}): string => {
  switch (platform ?? process.platform) {
    case 'darwin':
      return getMacOSTrayIconPath(badge, presence);

    case 'win32':
      return getWindowsTrayIconPath(badge, presence);

    case 'linux':
      return getLinuxTrayIconPath(badge, presence);

    default:
      throw Error(`unsupported platform (${platform})`);
  }
};
