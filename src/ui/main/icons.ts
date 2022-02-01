import path from 'path';

import { app } from 'electron';

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

const getMacOSTrayIconPath = (visible: boolean): string =>
  path.join(
    app.getAppPath(),
    `app/images/tray/darwin/${visible ? 'defaultTemplate' : 'invisible'}.png`
  );

const getWindowsTrayIconPath = (visible: boolean): string => {
  const name = visible ? 'default' : 'invisible';
  return path.join(app.getAppPath(), `app/images/tray/win32/${name}.ico`);
};

const getLinuxTrayIconPath = (visible: boolean): string =>
  path.join(
    app.getAppPath(),
    `app/images/tray/linux/${visible ? 'default' : 'invisible'}.png`
  );

export const getTrayIconPath = ({
  platform,
  visible,
}: {
  platform: NodeJS.Platform;
  visible: boolean;
}): string => {
  switch (platform ?? process.platform) {
    case 'darwin':
      return getMacOSTrayIconPath(visible);

    case 'win32':
      return getWindowsTrayIconPath(visible);

    case 'linux':
      return getLinuxTrayIconPath(visible);

    default:
      throw Error(`unsupported platform (${platform})`);
  }
};
