export {};

const select = jest.fn();
const dispatch = jest.fn();
const watchCallbacks = new Map<unknown, Function>();
const getRootWindow = jest.fn();
const getTrayIconPath = jest.fn((..._args: any[]) => '/icon.png');
const getAppIconPath = jest.fn((..._args: any[]) => '/app.png');

const trayMethods = {
  addListener: jest.fn(),
  setImage: jest.fn(),
  setTitle: jest.fn(),
  setToolTip: jest.fn(),
  setContextMenu: jest.fn(),
  displayBalloon: jest.fn(),
  destroy: jest.fn(),
  popUpContextMenu: jest.fn(),
};

jest.mock('electron', () => ({
  app: {
    name: 'Rocket.Chat',
    quit: jest.fn(),
  },
  Menu: {
    buildFromTemplate: jest.fn((template) => template),
  },
  nativeImage: {
    createEmpty: jest.fn(() => ({})),
    createFromPath: jest.fn(() => ({})),
  },
  Tray: jest.fn(() => trayMethods),
}));

jest.mock('i18next', () => ({
  t: (key: string) => key,
}));

jest.mock('../../store', () => {
  class Service {
    protected watch(selector: unknown, cb: Function) {
      watchCallbacks.set(selector, cb);
      // immediately invoke with a default to mirror store watch first-fire
      try {
        cb(true);
      } catch {
        // ignore
      }
    }

    protected initialize(): void {}

    setUp() {
      this.initialize();
    }

    protected destroy(): void {}
  }
  return {
    Service,
    select: (...args: unknown[]) => select(...args),
    dispatch: (...args: unknown[]) => dispatch(...args),
    watch: jest.fn((selector: unknown, cb: Function) => {
      watchCallbacks.set(selector, cb);
      return jest.fn();
    }),
  };
});

jest.mock('../selectors', () => ({
  selectGlobalBadge: (state: any) => state.globalBadge,
}));

jest.mock('./icons', () => ({
  getTrayIconPath: (...args: any[]) => getTrayIconPath(...args),
  getAppIconPath: (...args: any[]) => getAppIconPath(...args),
}));

jest.mock('./rootWindow', () => ({
  getRootWindow: () => getRootWindow(),
}));

describe('ui/main/trayIcon', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    watchCallbacks.clear();
    getRootWindow.mockResolvedValue({
      isVisible: () => true,
      show: jest.fn(),
      hide: jest.fn(),
    });
    select.mockImplementation((selector: any) => {
      if (typeof selector === 'function') {
        return selector({
          rootWindowState: { visible: true },
          hasHideOnTrayNotificationShown: false,
          globalBadge: 3,
        });
      }
      return undefined;
    });
    jest.resetModules();
  });

  it('exports a tray icon service', () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const service = require('./trayIcon').default;
    expect(service).toBeDefined();
    expect(typeof service.setUp).toBe('function');
  });

  it('creates tray when enabled via initialize watch', async () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { Tray } = require('electron');
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const service = require('./trayIcon').default;
    service.setUp();
    // Allow manageTrayIcon promise to resolve
    await new Promise((r) => setTimeout(r, 20));
    expect(Tray).toHaveBeenCalled();
    expect(trayMethods.setImage).toHaveBeenCalled();
  });
});
