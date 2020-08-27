import { app, nativeTheme } from 'electron';

import { Server } from '../../servers/common';

type Platform = 'win32' | 'darwin'| 'linux';

const getTrayIconSet = ({ platform, dark }: { platform: Platform, dark: boolean }): string => {
  if (platform === 'darwin') {
    return `darwin${ dark ? '-dark' : '' }`;
  }

  return platform;
};

const getTrayIconName = ({ badge, platform }: { badge: Server['badge'], platform: NodeJS.Platform }): string => {
  if (platform === 'darwin') {
    return badge ? 'notification' : 'default';
  }

  if (badge === '•') {
    return 'notification-dot';
  }

  if (Number.isInteger(badge)) {
    return badge > 9 ? 'notification-plus-9' : `notification-${ String(badge) }`;
  }

  return 'default';
};

const getTrayIconExtension = ({ platform }: { platform: NodeJS.Platform }): string => {
  if (platform === 'win32') {
    return 'ico';
  }

  return 'png';
};

export const getAppIconPath = (): string => `${ app.getAppPath() }/app/images/icon.png`;

export const getTrayIconPath = ({ badge = undefined, platform = undefined, dark = undefined } = {}): string => {
  if (typeof platform === 'undefined') {
    platform = process.platform;
  }

  if (platform === 'darwin' && typeof dark === 'undefined') {
    dark = nativeTheme.shouldUseDarkColors;
  }

  const params = { badge, platform, dark };
  const iconset = getTrayIconSet(params);
  const name = getTrayIconName(params);
  const extension = getTrayIconExtension(params);
  return `${ app.getAppPath() }/app/images/tray/${ iconset }/${ name }.${ extension }`;
};
