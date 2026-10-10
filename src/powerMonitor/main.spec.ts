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
  let mockOffscreenWc: any;

  beforeEach(() => {
    jest.clearAllMocks();
    powerListeners.clear();
    mockWebContents.length = 0;

    mockWc1 = {
      id: 1,
      isDestroyed: jest.fn(() => false),
      getType: jest.fn(() => 'window'),
      setFrameRate: jest.fn(),
      setBackgroundThrottling: jest.fn(),
      getBackgroundThrottling: jest.fn(() => false),
    };

    mockWc2 = {
      id: 2,
      isDestroyed: jest.fn(() => false),
      getType: jest.fn(() => 'webview'),
      setFrameRate: jest.fn(),
      setBackgroundThrottling: jest.fn(),
      getBackgroundThrottling: jest.fn(() => true),
    };

    mockOffscreenWc = {
      id: 3,
      isDestroyed: jest.fn(() => false),
      getType: jest.fn(() => 'offscreen'),
      setFrameRate: jest.fn(),
      setBackgroundThrottling: jest.fn(),
      getBackgroundThrottling: jest.fn(() => true),
    };

    mockWebContents.push(mockWc1, mockWc2, mockOffscreenWc);

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

  it('throttles normal-rendered contents via setBackgroundThrottling and offscreen contents via setFrameRate on suspend', () => {
    powerListeners.get('suspend')?.();

    expect(mockWc1.setBackgroundThrottling).toHaveBeenCalledWith(true);
    expect(mockWc1.setFrameRate).not.toHaveBeenCalled();

    expect(mockWc2.setBackgroundThrottling).toHaveBeenCalledWith(true);
    expect(mockWc2.setFrameRate).not.toHaveBeenCalled();

    expect(mockOffscreenWc.setBackgroundThrottling).toHaveBeenCalledWith(true);
    expect(mockOffscreenWc.setFrameRate).toHaveBeenCalledWith(10);
  });

  it('restores original background throttling on resume and restores offscreen frame rate', () => {
    powerListeners.get('suspend')?.();

    mockWc1.setBackgroundThrottling.mockClear();
    mockWc2.setBackgroundThrottling.mockClear();
    mockOffscreenWc.setBackgroundThrottling.mockClear();
    mockOffscreenWc.setFrameRate.mockClear();

    powerListeners.get('resume')?.();

    expect(mockWc1.setBackgroundThrottling).toHaveBeenCalledWith(false);
    expect(mockWc1.setFrameRate).not.toHaveBeenCalled();

    expect(mockWc2.setBackgroundThrottling).toHaveBeenCalledWith(true);
    expect(mockWc2.setFrameRate).not.toHaveBeenCalled();

    expect(mockOffscreenWc.setBackgroundThrottling).toHaveBeenCalledWith(true);
    expect(mockOffscreenWc.setFrameRate).toHaveBeenCalledWith(60);
  });

  it('handles destroyed web contents gracefully', () => {
    const destroyedWc = {
      id: 4,
      isDestroyed: jest.fn(() => true),
      getType: jest.fn(() => 'window'),
      setFrameRate: jest.fn(),
      setBackgroundThrottling: jest.fn(),
    };
    mockWebContents.push(destroyedWc);

    expect(() => powerListeners.get('lock-screen')?.()).not.toThrow();
    expect(destroyedWc.setBackgroundThrottling).not.toHaveBeenCalled();

    expect(() => powerListeners.get('unlock-screen')?.()).not.toThrow();
    expect(destroyedWc.setBackgroundThrottling).not.toHaveBeenCalled();
  });
});
