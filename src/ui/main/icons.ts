import { app } from 'electron';

import { Server } from '../../servers/common';

type Platform = 'win32' | 'darwin' | 'linux';

const getTrayIconName = ({ badge, platform }: { badge: Server['badge'], platform: Platform }): string => {
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

const getTrayIconExtension = ({ platform }: { platform: Platform }): string => {
  if (platform === 'win32') {
    return 'ico';
  }

  return 'png';
};

export const getAppIconPath = (): string => `${ app.getAppPath() }/app/images/icon.png`;

const getMacOSTrayIconPath = (badge: Server['badge']): string =>
  `${ app.getAppPath() }/app/images/tray/darwin/${ badge ? 'notification' : 'default' }Template.png`;

export const getTrayIconPath = ({ badge = undefined, platform = undefined } = {}): string => {
  if (typeof platform === 'undefined') {
    platform = process.platform;
  }

  switch (platform) {
    case 'darwin':
      return getMacOSTrayIconPath(badge);
  }

  const params = { badge, platform };
  const name = getTrayIconName(params);
  const extension = getTrayIconExtension(params);
  return `${ app.getAppPath() }/app/images/tray/${ platform }/${ name }.${ extension }`;
};
