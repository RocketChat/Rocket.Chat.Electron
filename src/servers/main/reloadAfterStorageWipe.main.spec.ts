import type { WebContents } from 'electron';

import { reloadAfterStorageWipe } from '../reloadAfterStorageWipe';

describe('reloadAfterStorageWipe', () => {
  it('reloads the page ignoring the cache', () => {
    const webContents = { reloadIgnoringCache: jest.fn() };

    reloadAfterStorageWipe(webContents as unknown as WebContents);

    expect(webContents.reloadIgnoringCache).toHaveBeenCalledTimes(1);
  });
});
