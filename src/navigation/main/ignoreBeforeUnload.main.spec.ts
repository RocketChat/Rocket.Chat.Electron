import { EventEmitter } from 'events';

import { app } from 'electron';

import { loggers } from '../../logging/scopes';
import { setupIgnoreBeforeUnload } from '../ignoreBeforeUnload';

jest.mock('electron', () => ({
  app: { on: jest.fn() },
}));

describe('setupIgnoreBeforeUnload', () => {
  const appOnMock = app.on as jest.Mock;

  const createWebContents = (type: string, url: string) =>
    Object.assign(new EventEmitter(), {
      getType: jest.fn(() => type),
      getURL: jest.fn(() => url),
    });

  const emitWebContentsCreated = (
    webContents: ReturnType<typeof createWebContents>
  ): void => {
    const [, listener] = appOnMock.mock.calls.find(
      ([eventName]) => eventName === 'web-contents-created'
    );
    listener({}, webContents);
  };

  beforeEach(() => {
    appOnMock.mockClear();
    jest.spyOn(loggers.main, 'info').mockImplementation();
    setupIgnoreBeforeUnload();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it.each(['webview', 'window', 'browserView'])(
    'ignores a beforeunload handler in a %s',
    (type) => {
      const webContents = createWebContents(type, 'https://chat.example.com/');
      emitWebContentsCreated(webContents);

      const preventDefault = jest.fn();
      webContents.emit('will-prevent-unload', { preventDefault });

      expect(preventDefault).toHaveBeenCalledTimes(1);
    }
  );

  it('keeps ignoring the handler for every later navigation', () => {
    const webContents = createWebContents(
      'webview',
      'https://chat.example.com/'
    );
    emitWebContentsCreated(webContents);

    const preventDefault = jest.fn();
    webContents.emit('did-start-navigation', {
      isMainFrame: true,
      isSameDocument: false,
    });
    webContents.emit('will-prevent-unload', { preventDefault });
    webContents.emit('will-prevent-unload', { preventDefault });

    expect(preventDefault).toHaveBeenCalledTimes(2);
  });

  it('logs only the origin, because the URL can carry a token', () => {
    const webContents = createWebContents(
      'webview',
      'https://chat.example.com/home?resumeToken=secret&userId=123'
    );
    emitWebContentsCreated(webContents);

    webContents.emit('will-prevent-unload', { preventDefault: jest.fn() });

    expect(loggers.main.info).toHaveBeenCalledWith(
      'Ignored a beforeunload handler',
      { type: 'webview', origin: 'https://chat.example.com' }
    );
    expect(
      JSON.stringify((loggers.main.info as jest.Mock).mock.calls)
    ).not.toContain('secret');
  });

  it('logs an unknown origin for a URL that cannot be parsed', () => {
    const webContents = createWebContents('window', '');
    emitWebContentsCreated(webContents);

    webContents.emit('will-prevent-unload', { preventDefault: jest.fn() });

    expect(loggers.main.info).toHaveBeenCalledWith(
      'Ignored a beforeunload handler',
      { type: 'window', origin: 'unknown' }
    );
  });
});
