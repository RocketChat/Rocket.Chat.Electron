export {};

const select = jest.fn();
const watchCallbacks = new Map<unknown, Function>();

jest.mock('electron', () => ({
  app: {
    dock: {
      setBadge: jest.fn(),
      bounce: jest.fn(),
    },
  },
}));

jest.mock('../../store', () => {
  class Service {
    protected watch(selector: unknown, cb: Function) {
      watchCallbacks.set(selector, cb);
    }

    protected initialize(): void {}

    setUp() {
      this.initialize();
    }
  }
  return {
    Service,
    select: (...args: unknown[]) => select(...args),
  };
});

describe('ui/main/dock', () => {
  const originalPlatform = process.platform;

  afterEach(() => {
    Object.defineProperty(process, 'platform', {
      value: originalPlatform,
      configurable: true,
    });
    jest.resetModules();
  });

  it('exports a service instance', () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const dock = require('./dock').default;
    expect(dock).toBeDefined();
    expect(typeof dock.setUp).toBe('function');
  });

  it('no-ops initialize on non-darwin platforms', () => {
    Object.defineProperty(process, 'platform', {
      value: 'linux',
      configurable: true,
    });
    watchCallbacks.clear();
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const dock = require('./dock').default;
    expect(() => dock.setUp()).not.toThrow();
    expect(watchCallbacks.size).toBe(0);
  });

  it('registers badge and bounce watches on darwin and drives dock APIs', () => {
    Object.defineProperty(process, 'platform', {
      value: 'darwin',
      configurable: true,
    });
    watchCallbacks.clear();
    select.mockImplementation((selector: any) =>
      selector({ isFlashFrameEnabled: true })
    );

    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { app } = require('electron');
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const dock = require('./dock').default;
    dock.setUp();

    expect(watchCallbacks.size).toBe(2);

    const [badgeTextCallback, badgeCountCallback] = [
      ...watchCallbacks.values(),
    ];

    badgeTextCallback('3');
    expect(app.dock.setBadge).toHaveBeenCalledWith('3');

    badgeCountCallback(3, 0);
    expect(app.dock.bounce).toHaveBeenCalled();
  });

  it('does not bounce the dock when flash frame is disabled', () => {
    Object.defineProperty(process, 'platform', {
      value: 'darwin',
      configurable: true,
    });
    watchCallbacks.clear();
    select.mockImplementation((selector: any) =>
      selector({ isFlashFrameEnabled: false })
    );

    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { app } = require('electron');
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const dock = require('./dock').default;
    dock.setUp();

    const [, badgeCountCallback] = [...watchCallbacks.values()];
    badgeCountCallback(3, 0);
    expect(app.dock.bounce).not.toHaveBeenCalled();
  });
});
