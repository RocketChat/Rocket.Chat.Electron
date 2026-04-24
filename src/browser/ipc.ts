import { handle } from '../ipc/main';
import { openExternal } from '../utils/browserLauncher';

export const startBrowserHandler = (): void => {
  handle('browser/open-url', async (_event, url) => {
    try {
      const parsed = new URL(url);
      if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
        return;
      }
      await openExternal(parsed.toString());
    } catch {
      // Invalid URL — ignore
    }
  });
};
