import { join } from 'path';

import { app } from 'electron';

export const joinAsarPath = (...parts: string[]): string =>
  join(app.getAppPath(), 'app', ...parts);
