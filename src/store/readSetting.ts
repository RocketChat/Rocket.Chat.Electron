import fs from 'fs';
import path from 'path';

import { app } from 'electron';

export const readSetting = (key: string) => {
  try {
    const filePath = path.join(app.getPath('userData'), 'config.json');
    const content = fs.readFileSync(filePath, 'utf8');
    const json = JSON.parse(content);

    return json[key];
  } catch (e) {
    return null;
  }
};
