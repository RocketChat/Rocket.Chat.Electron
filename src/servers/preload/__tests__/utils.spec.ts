import { clipboard, ipcRenderer } from 'electron';

import { dispatch } from '../../../store';
import {
  WEBVIEW_SERVER_VERSION_UPDATED,
  WEBVIEW_USER_LOGGED_IN,
} from '../../../ui/actions';
import { writeTextToClipboard } from '../clipboard';
import { openInBrowser } from '../openInBrowser';
import { getServerUrl } from '../urls';
import { setUserLoggedIn } from '../userLoggedIn';
import { clearUserRoles, updateUserRoles } from '../userRoles';
import { setVersion } from '../version';

jest.mock('electron', () => ({
  ipcRenderer: {
    invoke: jest.fn(),
  },
  clipboard: {
    writeText: jest.fn(),
  },
}));

jest.mock('../../../store', () => ({
  dispatch: jest.fn(),
}));

jest.mock('../urls', () => ({
  getServerUrl: jest.fn(() => 'https://server.local'),
}));

jest.mock('../userRoles', () => ({
  updateUserRoles: jest.fn(async () => ({ ok: true })),
  clearUserRoles: jest.fn(),
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

  it('dispatches server version updates', () => {
    setVersion('1.2.3');

    expect(dispatch).toHaveBeenCalledWith({
      type: WEBVIEW_SERVER_VERSION_UPDATED,
      payload: {
        url: getServerUrl(),
        version: '1.2.3',
      },
    });
  });

  it('dispatches login status and updates roles for logged-in users', () => {
    setUserLoggedIn(true);

    expect(dispatch).toHaveBeenCalledWith({
      type: WEBVIEW_USER_LOGGED_IN,
      payload: {
        url: getServerUrl(),
        userLoggedIn: true,
      },
    });
    expect(updateUserRoles).toHaveBeenCalledTimes(1);
    expect(clearUserRoles).not.toHaveBeenCalled();
  });

  it('dispatches login status and clears roles for logged-out users', () => {
    setUserLoggedIn(false);

    expect(dispatch).toHaveBeenCalledWith({
      type: WEBVIEW_USER_LOGGED_IN,
      payload: {
        url: getServerUrl(),
        userLoggedIn: false,
      },
    });
    expect(clearUserRoles).toHaveBeenCalledTimes(1);
    expect(updateUserRoles).not.toHaveBeenCalled();
  });
});
