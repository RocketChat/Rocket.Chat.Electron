import path from 'path';
import { pathToFileURL } from 'url';

import { BrowserWindow } from 'electron';

import { openExternal } from '../../utils/browserLauncher';
import { createRootWindow, exportLocalStorage } from './rootWindow';

jest.mock('electron', () => ({
  app: {
    getAppPath: jest.fn(() => jest.requireActual('path').resolve('/rc-app')),
    commandLine: { hasSwitch: jest.fn(() => false) },
  },
  autoUpdater: { addListener: jest.fn() },
  BrowserWindow: jest.fn(),
  Menu: { buildFromTemplate: jest.fn() },
  nativeImage: { createEmpty: jest.fn(), createFromPath: jest.fn() },
  nativeTheme: { shouldUseDarkColors: false, on: jest.fn() },
  screen: { getAllDisplays: jest.fn(() => []) },
}));

jest.mock('../../store', () => ({
  select: jest.fn(),
  watch: jest.fn(() => jest.fn()),
  listen: jest.fn(() => jest.fn()),
  dispatchLocal: jest.fn(),
  dispatch: jest.fn(),
}));

jest.mock('../../app/main/dev', () => ({ setupRootWindowReload: jest.fn() }));
jest.mock('./icons', () => ({ getTrayIconPath: jest.fn() }));
jest.mock('../../utils/browserLauncher', () => ({
  openExternal: jest.fn(),
}));

const indexUrl = pathToFileURL(
  path.join(path.resolve('/rc-app'), 'app/index.html')
).href;

const setUpRootWindow = async () => {
  let willNavigate: (event: any, url: string) => void = () => undefined;
  let windowOpenHandler: (details: { url: string }) => {
    action: string;
  } = () => ({ action: 'unset' });

  (BrowserWindow as unknown as jest.Mock).mockImplementation(() => ({
    loadFile: jest.fn(),
    once: jest.fn((_event: string, callback: () => void) => callback()),
    destroy: jest.fn(),
    addListener: jest.fn(),
    webContents: {
      executeJavaScript: jest.fn(async () => ({})),
      on: jest.fn((event: string, listener: typeof willNavigate) => {
        if (event === 'will-navigate') {
          willNavigate = listener;
        }
      }),
      setWindowOpenHandler: jest.fn((handler: typeof windowOpenHandler) => {
        windowOpenHandler = handler;
      }),
    },
  }));

  await exportLocalStorage();
  createRootWindow();

  const navigate = (url: string) => {
    const event = { preventDefault: jest.fn() };
    willNavigate(event, url);
    return event.preventDefault.mock.calls.length > 0;
  };

  return { navigate, open: (url: string) => windowOpenHandler({ url }) };
};

describe('root window navigation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('stays on the app page for a web URL', async () => {
    const { navigate } = await setUpRootWindow();

    expect(navigate('https://example.com/')).toBe(true);
    expect(navigate('http://example.com/')).toBe(true);
    expect(navigate('smb://example.com/share')).toBe(true);
  });

  it('stays on the app page for another file', async () => {
    const { navigate } = await setUpRootWindow();

    expect(
      navigate(pathToFileURL(path.resolve('/rc-app/app/other.html')).href)
    ).toBe(true);
    expect(navigate(pathToFileURL(path.resolve('/etc/hosts')).href)).toBe(true);
  });

  it('allows navigation to the app page', async () => {
    const { navigate } = await setUpRootWindow();

    expect(navigate(indexUrl)).toBe(false);
    expect(navigate(`${indexUrl}#/settings`)).toBe(false);
    expect(navigate(`${indexUrl}?a=1`)).toBe(false);
  });

  it('denies new windows and opens http(s) links externally', async () => {
    const { open } = await setUpRootWindow();

    expect(open('https://example.com/')).toEqual({ action: 'deny' });
    expect(openExternal).toHaveBeenCalledWith('https://example.com/');
  });

  it('opens only http(s) links in the browser', async () => {
    const { open } = await setUpRootWindow();

    expect(open(indexUrl)).toEqual({ action: 'deny' });
    expect(open('javascript:alert(1)')).toEqual({ action: 'deny' });
    expect(open('smb://example.com/share')).toEqual({ action: 'deny' });
    expect(openExternal).not.toHaveBeenCalled();
  });
});
