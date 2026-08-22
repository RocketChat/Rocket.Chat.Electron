export {};

const select = jest.fn();
const dispatch = jest.fn();
const watchCallbacks: Function[] = [];
const getRootWindow = jest.fn();
const touchBarCtor = jest.fn(() => ({}));
const scrubberCtor = jest.fn((opts) => ({ ...opts, items: [] }));
const popoverCtor = jest.fn((opts) => ({ ...opts }));
const segmentedCtor = jest.fn((opts) => ({
  ...opts,
  segments: (opts.segments || []).map((s: any) => ({ ...s })),
}));
const spacerCtor = jest.fn(() => ({}));

jest.mock('electron', () => ({
  app: {
    getAppPath: jest.fn(() => '/app'),
  },
  nativeImage: {
    createFromPath: jest.fn(() => ({})),
    createFromDataURL: jest.fn(() => ({})),
    createEmpty: jest.fn(() => ({})),
  },
  TouchBar: Object.assign(touchBarCtor, {
    TouchBarScrubber: scrubberCtor,
    TouchBarPopover: popoverCtor,
    TouchBarSegmentedControl: segmentedCtor,
    TouchBarSpacer: spacerCtor,
  }),
}));

jest.mock('i18next', () => ({
  t: (key: string) => key,
}));

jest.mock('../../store', () => {
  class Service {
    protected watch(_sel: unknown, cb: Function) {
      watchCallbacks.push(cb);
    }

    protected initialize(): void {}

    setUp() {
      this.initialize();
    }
  }
  return {
    Service,
    select: (...args: unknown[]) => select(...args),
    dispatch: (...args: unknown[]) => dispatch(...args),
  };
});

jest.mock('./rootWindow', () => ({
  getRootWindow: (...args: unknown[]) => getRootWindow(...args),
}));

describe('ui/main/touchBar', () => {
  const originalPlatform = process.platform;

  beforeEach(() => {
    jest.clearAllMocks();
    watchCallbacks.length = 0;
    Object.defineProperty(process, 'platform', {
      value: 'darwin',
      configurable: true,
    });
    getRootWindow.mockResolvedValue({
      isVisible: () => true,
      showInactive: jest.fn(),
      focus: jest.fn(),
      setTouchBar: jest.fn(),
    });
    select.mockImplementation((selector: any) =>
      selector({
        servers: [{ url: 'https://a.example', title: 'A', favicon: null }],
        currentView: { url: 'https://a.example' },
        isMessageBoxFocused: true,
      })
    );
    jest.resetModules();
  });

  afterEach(() => {
    Object.defineProperty(process, 'platform', {
      value: originalPlatform,
      configurable: true,
    });
  });

  it('no-ops on non-darwin platforms', () => {
    Object.defineProperty(process, 'platform', {
      value: 'linux',
      configurable: true,
    });
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const service = require('./touchBar').default;
    service.setUp();
    expect(watchCallbacks).toHaveLength(0);
  });

  it('initializes touch bar service and registers state watches on darwin', () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const service = require('./touchBar').default;
    // Override setUp to call initialize if Service mock setUp is empty
    // The real Service subclass implements initialize; our mock setUp calls it.
    service.setUp();
    expect(scrubberCtor).toHaveBeenCalled();
    expect(popoverCtor).toHaveBeenCalled();
    expect(segmentedCtor).toHaveBeenCalled();
    expect(touchBarCtor).toHaveBeenCalled();
    expect(watchCallbacks.length).toBe(3);
  });
});
