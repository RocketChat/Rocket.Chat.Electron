jest.mock('electron', () => ({
  app: {
    whenReady: jest.fn(async () => undefined),
    on: jest.fn(),
    getPath: jest.fn(() => '/tmp'),
    getAppPath: jest.fn(() => '/app'),
    getName: jest.fn(() => 'Rocket.Chat'),
    getVersion: jest.fn(() => '4.0.0'),
    requestSingleInstanceLock: jest.fn(() => true),
    quit: jest.fn(),
    commandLine: { appendSwitch: jest.fn(), hasSwitch: jest.fn(() => false) },
  },
  BrowserWindow: jest.fn(),
  session: { defaultSession: { setPermissionRequestHandler: jest.fn() } },
  ipcMain: { on: jest.fn(), handle: jest.fn() },
  nativeTheme: { shouldUseDarkColors: false, on: jest.fn() },
  screen: {
    getPrimaryDisplay: jest.fn(() => ({
      workAreaSize: { width: 1920, height: 1080 },
    })),
    getAllDisplays: jest.fn(() => []),
  },
}));

describe('main process entry modules', () => {
  it('loads whenReady, constants, and systemCertificates', () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    expect(require('../../whenReady')).toBeDefined();
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    expect(require('../../constants')).toBeDefined();
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    expect(require('../../systemCertificates')).toBeDefined();
  });
});
