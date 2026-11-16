import fs from 'fs';
import path from 'path';

import { app } from 'electron';

import packageJson from '../../../package.json';

// Path of a device-wide configuration file (servers.json,
// overridden-settings.json) that an administrator puts next to app.asar.
// On macOS, /Library/Preferences/<productName>/ wins when the file exists
// there: it is outside the signed app bundle and an update does not replace it.
export const getAppConfigFilePath = (fileName: string): string => {
  if (process.platform === 'darwin') {
    const preferencesFilePath = path.join(
      '/Library/Preferences',
      packageJson.productName,
      fileName
    );

    if (fs.existsSync(preferencesFilePath)) {
      return preferencesFilePath;
    }
  }

  return path.join(
    app.getAppPath(),
    app.getAppPath().endsWith('app.asar') ? '..' : '.',
    fileName
  );
};
