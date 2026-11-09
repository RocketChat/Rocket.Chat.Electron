import { EventEmitter } from 'events';

import type { WebContents } from 'electron';

import { reloadAfterStorageWipe } from '../reloadAfterStorageWipe';

describe('reloadAfterStorageWipe', () => {
  const createWebContents = () =>
    Object.assign(new EventEmitter(), {
      reloadIgnoringCache: jest.fn(),
    });

  it('reloads the page ignoring the cache', () => {
    const webContents = createWebContents();

    reloadAfterStorageWipe(webContents as unknown as WebContents);

    expect(webContents.reloadIgnoringCache).toHaveBeenCalledTimes(1);
  });

  it('ignores a beforeunload handler that tries to cancel the reload', () => {
    const webContents = createWebContents();
    reloadAfterStorageWipe(webContents as unknown as WebContents);

    const preventDefault = jest.fn();
    webContents.emit('will-prevent-unload', { preventDefault });

    expect(preventDefault).toHaveBeenCalledTimes(1);
  });

  it('respects beforeunload again once the new page starts loading', () => {
    const webContents = createWebContents();
    reloadAfterStorageWipe(webContents as unknown as WebContents);

    webContents.emit('did-start-navigation', {
      isMainFrame: false,
      isSameDocument: false,
    });
    webContents.emit('did-start-navigation', {
      isMainFrame: true,
      isSameDocument: true,
    });
    expect(webContents.listenerCount('will-prevent-unload')).toBe(1);

    webContents.emit('did-start-navigation', {
      isMainFrame: true,
      isSameDocument: false,
    });
    expect(webContents.listenerCount('will-prevent-unload')).toBe(0);
    expect(webContents.listenerCount('did-start-navigation')).toBe(0);

    const preventDefault = jest.fn();
    webContents.emit('will-prevent-unload', { preventDefault });
    expect(preventDefault).not.toHaveBeenCalled();
  });
});
