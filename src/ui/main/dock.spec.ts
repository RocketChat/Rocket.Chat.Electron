jest.mock('electron', () => ({
  app: {
    dock: {
      setBadge: jest.fn(),
      bounce: jest.fn(),
    },
  },
}));

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
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const dock = require('./dock').default;
    expect(() => dock.setUp()).not.toThrow();
  });
});
