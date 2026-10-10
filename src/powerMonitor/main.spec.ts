export {};

const powerListeners = new Map<string, () => void>();
const mockWebContents: any[] = [];

jest.mock('electron', () => ({
  powerMonitor: {
    on: (event: string, fn: () => void) => {
      powerListeners.set(event, fn);
    },
  },
  webContents: {
    getAllWebContents: () => mockWebContents,
  },
}));

describe('powerMonitor setupFrameRateThrottling', () => {
  let mockWc1: any;
  let mockWc2: any;

  beforeEach(() => {
    jest.clearAllMocks();
    powerListeners.clear();
    mockWebContents.length = 0;

    mockWc1 = {
      id: 1,
      isDestroyed: jest.fn(() => false),
      setFrameRate: jest.fn(),
      setBackgroundThrottling: jest.fn(),
      getWebPreferences: jest.fn(() => ({ backgroundThrottling: false })),
    };

    mockWc2 = {
      id: 2,
      isDestroyed: jest.fn(() => false),
      setFrameRate: jest.fn(),
      setBackgroundThrottling: jest.fn(),
      getWebPreferences: jest.fn(() => ({ backgroundThrottling: true })),
    };

    mockWebContents.push(mockWc1, mockWc2);

    jest.resetModules();
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    require('./main').setupFrameRateThrottling();
  });

  it('registers suspend, lock-screen, resume, and unlock-screen listeners', () => {
    expect(powerListeners.has('suspend')).toBe(true);
    expect(powerListeners.has('lock-screen')).toBe(true);
    expect(powerListeners.has('resume')).toBe(true);
    expect(powerListeners.has('unlock-screen')).toBe(true);
  });

  it('throttles frame rate to 10 FPS and preserves original background throttling on suspend', () => {
    powerListeners.get('suspend')?.();

    expect(mockWc1.setFrameRate).toHaveBeenCalledWith(10);
    expect(mockWc1.setBackgroundThrottling).toHaveBeenCalledWith(true);

    expect(mockWc2.setFrameRate).toHaveBeenCalledWith(10);
    expect(mockWc2.setBackgroundThrottling).toHaveBeenCalledWith(true);
  });

  it('restores frame rate to 60 FPS and restores original background throttling on resume', () => {
    powerListeners.get('suspend')?.();

    mockWc1.setFrameRate.mockClear();
    mockWc1.setBackgroundThrottling.mockClear();
    mockWc2.setFrameRate.mockClear();
    mockWc2.setBackgroundThrottling.mockClear();

    powerListeners.get('resume')?.();

    expect(mockWc1.setFrameRate).toHaveBeenCalledWith(60);
    expect(mockWc1.setBackgroundThrottling).toHaveBeenCalledWith(false);

    expect(mockWc2.setFrameRate).toHaveBeenCalledWith(60);
    expect(mockWc2.setBackgroundThrottling).toHaveBeenCalledWith(true);
  });

  it('handles destroyed web contents gracefully', () => {
    const destroyedWc = {
      id: 3,
      isDestroyed: jest.fn(() => true),
      setFrameRate: jest.fn(),
      setBackgroundThrottling: jest.fn(),
    };
    mockWebContents.push(destroyedWc);

    expect(() => powerListeners.get('lock-screen')?.()).not.toThrow();
    expect(destroyedWc.setFrameRate).not.toHaveBeenCalled();

    expect(() => powerListeners.get('unlock-screen')?.()).not.toThrow();
    expect(destroyedWc.setFrameRate).not.toHaveBeenCalled();
  });
});
