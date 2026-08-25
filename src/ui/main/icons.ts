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

// win32 and darwin show STATUS only in the tray icon — the Windows taskbar
// overlay and the macOS menu-bar title already show the unread count. There
// is no "unread + presence unknown" fallback asset on these two platforms:
// when presence is unknown the icon is always the default/disconnected
// icon, regardless of `badge`, so `badge` is ignored entirely on darwin/
// win32.
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
  badge: Server['badge'],
  presence: UserPresence | undefined,
  disconnected: boolean | undefined
): string => {
  if (disconnected) {
    // DisconnectedBadge ignores the badge value, so linux only needs the
    // presence-less on/off pair here — the count never varies the artwork.
    return path.join(
      app.getAppPath(),
      'app/images/tray/linux/disconnected.png'
    );
  }

  const name = presence
    ? `presence-${presence}${badge ? `-${getBadgeNamePart(badge)}` : ''}`
    : (!badge && 'default') || getBadgeNamePart(badge);
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
