import { join } from 'path';

import { app } from 'electron';

export const joinAppPath = (...parts: string[]): string =>
  join(
    app.getAppPath(),
    app.getAppPath().endsWith('app.asar') ? '..' : '.',
    ...parts
  );
