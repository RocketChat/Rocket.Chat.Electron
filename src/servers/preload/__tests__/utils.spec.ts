import { clipboard, ipcRenderer } from 'electron';

import { writeTextToClipboard } from '../clipboard';
import { openInBrowser } from '../openInBrowser';

jest.mock('electron', () => ({
  ipcRenderer: {
    invoke: jest.fn(),
  },
  clipboard: {
    writeText: jest.fn(),
  },
}));

describe('servers/preload utils', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('writes text to clipboard', () => {
    writeTextToClipboard('hello');

    expect(clipboard.writeText).toHaveBeenCalledWith('hello');
  });

  it('opens http/https URLs through ipcRenderer', () => {
    openInBrowser('https://example.com');

    expect(ipcRenderer.invoke).toHaveBeenCalledWith(
      'browser/open-url',
      'https://example.com/'
    );
  });

  it('blocks non-http URLs', () => {
    const spy = jest.spyOn(console, 'warn').mockImplementation(() => undefined);

    openInBrowser('ftp://example.com');

    expect(ipcRenderer.invoke).not.toHaveBeenCalled();
    expect(spy.mock.calls[0][0]).toEqual(
      expect.stringContaining(
        '[RocketChatDesktop.openInBrowser] blocked non-http(s) URL:'
      )
    );
    spy.mockRestore();
  });

  it('warns on invalid URLs', () => {
    const spy = jest.spyOn(console, 'warn').mockImplementation(() => undefined);

    openInBrowser('not-a-url');

    expect(ipcRenderer.invoke).not.toHaveBeenCalled();
    expect(spy.mock.calls[0][0]).toEqual(
      expect.stringContaining('[RocketChatDesktop.openInBrowser] invalid URL:')
    );
    spy.mockRestore();
  });
});
