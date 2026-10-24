import type { BrowserWindowConstructorOptions } from 'electron';
import { BrowserWindow, nativeTheme } from 'electron';

import { select } from '../../store';
import type * as RootWindow from './rootWindow';

jest.mock('electron', () => ({
  app: { getAppPath: jest.fn(() => '/test') },
  BrowserWindow: jest.fn(),
  nativeTheme: { shouldUseDarkColors: false },
}));
jest.mock('../../store', () => ({ select: jest.fn() }));
jest.mock('../../app/main/dev', () => ({}));
jest.mock('./icons', () => ({}));

const originalPlatform = process.platform;
const mockWindow = () => ({
  loadFile: jest.fn(),
  once: jest.fn((_event: string, ready: () => void) => ready()),
  destroy: jest.fn(),
  addListener: jest.fn(),
  webContents: {
    executeJavaScript: jest.fn().mockResolvedValue({}),
    on: jest.fn(
      (
        _event: string,
        _handler: (event: { preventDefault: () => void }, url: string) => void
      ) => undefined
    ),
    setWindowOpenHandler: jest.fn(
      (_handler: (details: { url: string }) => { action: string }) => undefined
    ),
  },
});

describe('native root window appearance', () => {
  afterEach(() => {
    Object.defineProperty(process, 'platform', {
      value: originalPlatform,
      configurable: true,
    });
    jest.clearAllMocks();
  });

  it.each<{
    platform: NodeJS.Platform;
    transparency: boolean | undefined;
    dark: boolean;
    appearance: BrowserWindowConstructorOptions;
  }>([
    {
      platform: 'darwin',
      transparency: false,
      dark: true,
      appearance: { backgroundColor: '#2f343d' },
    },
    {
      platform: 'darwin',
      transparency: false,
      dark: false,
      appearance: { backgroundColor: '#ffffff' },
    },
    {
      platform: 'darwin',
      transparency: true,
      dark: true,
      appearance: {
        transparent: true,
        backgroundColor: '#00000000',
        vibrancy: 'sidebar',
        visualEffectState: 'active',
      },
    },
    {
      platform: 'darwin',
      transparency: undefined,
      dark: true,
      appearance: { backgroundColor: '#2f343d' },
    },
    {
      platform: 'linux',
      transparency: true,
      dark: true,
      appearance: {
        transparent: true,
        backgroundColor: '#00000000',
        hasShadow: true,
      },
    },
    {
      platform: 'win32',
      transparency: true,
      dark: false,
      appearance: {},
    },
  ])(
    'creates $platform window with effective transparency=$transparency, dark=$dark',
    async ({ platform, transparency, dark, appearance }) => {
      Object.defineProperty(process, 'platform', {
        value: platform,
        configurable: true,
      });
      Object.defineProperty(nativeTheme, 'shouldUseDarkColors', {
        value: dark,
        configurable: true,
      });
      jest
        .mocked(select)
        .mockImplementation((selector) =>
          selector({ isTransparentWindowEnabled: transparency } as never)
        );
      const temporary = mockWindow();
      const root = mockWindow();
      jest
        .mocked(BrowserWindow)
        .mockImplementationOnce(() => temporary as never)
        .mockImplementationOnce(() => root as never);
      let windowModule!: typeof RootWindow;
      jest.isolateModules(() => {
        // Re-evaluate platform constants for each native constructor path.
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        windowModule = require('./rootWindow');
      });
      await windowModule.exportLocalStorage();
      windowModule.createRootWindow();

      expect(BrowserWindow).toHaveBeenNthCalledWith(2, {
        width: 1000,
        height: 600,
        minWidth: 400,
        minHeight: 400,
        titleBarStyle: 'hidden',
        ...(platform === 'darwin'
          ? { trafficLightPosition: { x: 12, y: 13 } }
          : {}),
        show: false,
        webPreferences: {
          nodeIntegration: true,
          nodeIntegrationInSubFrames: true,
          contextIsolation: false,
          webviewTag: true,
        },
        ...appearance,
      });
      expect(temporary.destroy).toHaveBeenCalledTimes(1);
      if (platform !== 'darwin') {
        expect(select).not.toHaveBeenCalled();
      }

      const navigate = root.webContents.on.mock.calls[0][1] as unknown as (
        event: { preventDefault: () => void },
        url: string
      ) => void;
      const preventDefault = jest.fn();
      navigate({ preventDefault }, 'smb://example.test/share');
      expect(preventDefault).toHaveBeenCalledTimes(1);
      navigate({ preventDefault }, 'https://example.test');
      expect(preventDefault).toHaveBeenCalledTimes(1);
      const open = root.webContents.setWindowOpenHandler.mock
        .calls[0][0] as (details: { url: string }) => { action: string };
      expect(open({ url: 'smb://example.test/share' })).toEqual({
        action: 'deny',
      });
      expect(open({ url: 'https://example.test' })).toEqual({
        action: 'allow',
      });
    }
  );
});
