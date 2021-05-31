import { join } from 'path';

import { app } from 'electron';

export const joinUserPath = (...parts: string[]): string =>
  join(app.getPath('userData'), ...parts);
