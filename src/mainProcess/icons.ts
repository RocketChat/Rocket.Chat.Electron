import type { Server } from '../common/types/Server';
import { joinAsarPath } from './joinAsarPath';

export const getAppIconPath = ({
  platform,
}: {
  platform: NodeJS.Platform;
}): string => {
  if (platform !== 'win32') {
    throw Error('only win32 platform is supported');
  }

  return joinAsarPath('images/icon.ico');
};

const getMacOSTrayIconPath = (badge: Server['badge']): string =>
  joinAsarPath(
    `images/tray/darwin/${badge ? 'notification' : 'default'}Template.png`
  );

const getWindowsTrayIconPath = (badge: Server['badge']): string => {
  const name =
    (!badge && 'default') ||
    (badge === '•' && 'notification-dot') ||
    (typeof badge === 'number' && badge > 9 && 'notification-plus-9') ||
    `notification-${badge}`;
  return joinAsarPath(`images/tray/win32/${name}.ico`);
};

const getLinuxTrayIconPath = (badge: Server['badge']): string => {
  const name =
    (!badge && 'default') ||
    (badge === '•' && 'notification-dot') ||
    (typeof badge === 'number' && badge > 9 && 'notification-plus-9') ||
    `notification-${badge}`;
  return joinAsarPath(`images/tray/linux/${name}.png`);
};

export const getTrayIconPath = ({
  badge,
  platform,
}: {
  badge?: number | '•';
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
