import { getAvailableBrowsers, launchBrowser } from 'detect-browsers';
import { shell } from 'electron';

import { dispatch } from '../../store';
import { readSetting } from '../../store/readSetting';
import { SETTINGS_AVAILABLE_BROWSERS_UPDATED } from '../../ui/actions';
import type * as BrowserLauncherModule from '../browserLauncher';

jest.mock('detect-browsers', () => ({
  getAvailableBrowsers: jest.fn(),
  launchBrowser: jest.fn(),
}));

jest.mock('electron', () => ({
  shell: {
    openExternal: jest.fn(),
  },
}));

jest.mock('../../store', () => ({
  dispatch: jest.fn(),
}));

jest.mock('../../store/readSetting', () => ({
  readSetting: jest.fn(),
}));

const mockGetAvailableBrowsers = getAvailableBrowsers as jest.Mock;
const mockLaunchBrowser = launchBrowser as jest.Mock;
const mockOpenExternal = shell.openExternal as jest.Mock;
const mockDispatch = dispatch as jest.Mock;
const mockReadSetting = readSetting as jest.Mock;

// browserLauncher caches state in module scope, so re-require it per test
// to exercise the lazy-load / promise-caching paths from a clean slate.
const loadModule = () => {
  let mod: typeof BrowserLauncherModule;
  jest.isolateModules(() => {
    mod = require('../browserLauncher');
  });
  return mod!;
};

const chromeBrowser = { browser: 'chrome', name: 'Google Chrome' } as any;
const firefoxBrowser = { browser: 'firefox', name: 'Firefox' } as any;

beforeEach(() => {
  jest.clearAllMocks();
  jest.useFakeTimers();
  mockOpenExternal.mockResolvedValue(undefined);
  mockLaunchBrowser.mockResolvedValue(undefined);
  jest.spyOn(console, 'error').mockImplementation(() => undefined);
  jest.spyOn(console, 'warn').mockImplementation(() => undefined);
});

afterEach(() => {
  jest.runOnlyPendingTimers();
  jest.useRealTimers();
  (console.error as jest.Mock).mockRestore();
  (console.warn as jest.Mock).mockRestore();
});

describe('openExternal', () => {
  it('uses system default when no browser is selected', async () => {
    mockReadSetting.mockReturnValue(undefined);
    const { openExternal } = loadModule();

    await openExternal('https://example.com');

    expect(mockOpenExternal).toHaveBeenCalledWith('https://example.com');
    expect(mockGetAvailableBrowsers).not.toHaveBeenCalled();
    expect(mockLaunchBrowser).not.toHaveBeenCalled();
  });

  it('lazy-loads browsers, dispatches the update and launches the selected browser', async () => {
    mockReadSetting.mockReturnValue('chrome');
    mockGetAvailableBrowsers.mockResolvedValue([chromeBrowser, firefoxBrowser]);
    const { openExternal } = loadModule();

    const promise = openExternal('https://example.com');
    // Advance past the 2s detection delay and flush the async detection.
    await jest.advanceTimersByTimeAsync(2000);
    await promise;

    expect(mockGetAvailableBrowsers).toHaveBeenCalledTimes(1);
    expect(mockDispatch).toHaveBeenCalledWith({
      type: SETTINGS_AVAILABLE_BROWSERS_UPDATED,
      payload: ['chrome', 'firefox'],
    });
    expect(mockLaunchBrowser).toHaveBeenCalledWith(
      chromeBrowser,
      'https://example.com'
    );
    expect(mockOpenExternal).not.toHaveBeenCalled();
  });

  it('reuses the cached browsers on subsequent calls (single detection)', async () => {
    mockReadSetting.mockReturnValue('chrome');
    mockGetAvailableBrowsers.mockResolvedValue([chromeBrowser]);
    const { openExternal } = loadModule();

    const first = openExternal('https://first.com');
    await jest.advanceTimersByTimeAsync(2000);
    await first;

    // Second call resolves from cache without scheduling a new detection.
    await openExternal('https://second.com');

    expect(mockGetAvailableBrowsers).toHaveBeenCalledTimes(1);
    expect(mockLaunchBrowser).toHaveBeenCalledTimes(2);
    expect(mockLaunchBrowser).toHaveBeenLastCalledWith(
      chromeBrowser,
      'https://second.com'
    );
  });

  it('does not dispatch when no browsers are detected', async () => {
    mockReadSetting.mockReturnValue('chrome');
    mockGetAvailableBrowsers.mockResolvedValue([]);
    const { openExternal } = loadModule();

    const promise = openExternal('https://example.com');
    await jest.advanceTimersByTimeAsync(2000);
    await promise;

    expect(mockDispatch).not.toHaveBeenCalled();
    // Selected browser not found -> falls back to system default.
    expect(mockOpenExternal).toHaveBeenCalledWith('https://example.com');
  });

  it('falls back to system default when the selected browser is unavailable', async () => {
    mockReadSetting.mockReturnValue('safari');
    mockGetAvailableBrowsers.mockResolvedValue([chromeBrowser]);
    const { openExternal } = loadModule();

    const promise = openExternal('https://example.com');
    await jest.advanceTimersByTimeAsync(2000);
    await promise;

    expect(mockLaunchBrowser).not.toHaveBeenCalled();
    expect(mockOpenExternal).toHaveBeenCalledWith('https://example.com');
  });

  it('falls back to system default and logs when detection rejects', async () => {
    mockReadSetting.mockReturnValue('chrome');
    mockGetAvailableBrowsers.mockRejectedValue(new Error('detect failed'));
    const { openExternal } = loadModule();

    const promise = openExternal('https://example.com');
    await jest.advanceTimersByTimeAsync(2000);
    await promise;

    // Detection error is caught inside the lazy loader (resolves []),
    // so the selected browser is simply not found -> system default.
    expect(mockLaunchBrowser).not.toHaveBeenCalled();
    expect(mockOpenExternal).toHaveBeenCalledWith('https://example.com');
    expect(console.error).toHaveBeenCalledWith(
      'Error detecting browsers:',
      expect.any(Error)
    );
  });

  it('propagates the rejection when launching the selected browser fails', async () => {
    // openExternal `return`s launchBrowser(...) directly (not awaited), so a
    // launch rejection escapes the try/catch and propagates to the caller.
    mockReadSetting.mockReturnValue('chrome');
    mockGetAvailableBrowsers.mockResolvedValue([chromeBrowser]);
    mockLaunchBrowser.mockRejectedValue(new Error('launch failed'));
    const { openExternal } = loadModule();

    const promise = openExternal('https://example.com');
    const assertion = expect(promise).rejects.toThrow('launch failed');
    await jest.advanceTimersByTimeAsync(2000);
    await assertion;

    expect(mockLaunchBrowser).toHaveBeenCalledWith(
      chromeBrowser,
      'https://example.com'
    );
    expect(mockOpenExternal).not.toHaveBeenCalled();
  });
});

describe('preloadBrowsersList', () => {
  it('triggers browser detection in the background after its delay', async () => {
    mockGetAvailableBrowsers.mockResolvedValue([chromeBrowser]);
    const { preloadBrowsersList } = loadModule();

    preloadBrowsersList();
    expect(mockGetAvailableBrowsers).not.toHaveBeenCalled();

    // 5s outer delay, then the 2s detection delay inside the lazy loader.
    await jest.advanceTimersByTimeAsync(5000);
    await jest.advanceTimersByTimeAsync(2000);

    expect(mockGetAvailableBrowsers).toHaveBeenCalledTimes(1);
    expect(mockDispatch).toHaveBeenCalledWith({
      type: SETTINGS_AVAILABLE_BROWSERS_UPDATED,
      payload: ['chrome'],
    });
  });

  it('logs when the background preload rejects', async () => {
    // Force loadBrowsersLazy itself to reject by making setTimeout-bound
    // promise creation throw is not feasible; instead detection rejecting is
    // swallowed internally, so assert the preload completes without throwing.
    mockGetAvailableBrowsers.mockRejectedValue(new Error('boom'));
    const { preloadBrowsersList } = loadModule();

    preloadBrowsersList();
    await jest.advanceTimersByTimeAsync(5000);
    await jest.advanceTimersByTimeAsync(2000);

    expect(console.error).toHaveBeenCalledWith(
      'Error detecting browsers:',
      expect.any(Error)
    );
  });
});
