export {};

const handlers = new Map<string, Function>();
const dispatch = jest.fn();
const powerListeners = new Map<string, Function>();

jest.mock('../../ipc/main', () => ({
  handle: (channel: string, fn: Function) => {
    handlers.set(channel, fn);
  },
}));

jest.mock('../../store', () => ({
  dispatch: (...args: any[]) => dispatch(...args),
}));

jest.mock('electron', () => ({
  powerMonitor: {
    addListener: (event: string, fn: Function) => {
      powerListeners.set(event, fn);
    },
    getSystemIdleState: jest.fn(() => 'active'),
  },
}));

describe('userPresence/main setupPowerMonitor', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    handlers.clear();
    powerListeners.clear();
    jest.resetModules();
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    require('../main').setupPowerMonitor();
  });

  it('registers power monitor listeners and idle-state handler', async () => {
    expect(powerListeners.has('suspend')).toBe(true);
    expect(powerListeners.has('lock-screen')).toBe(true);
    expect(handlers.has('power-monitor/get-system-idle-state')).toBe(true);

    powerListeners.get('suspend')?.();
    powerListeners.get('lock-screen')?.();
    expect(dispatch).toHaveBeenCalledTimes(2);

    const state = await handlers.get('power-monitor/get-system-idle-state')?.(
      {},
      60
    );
    expect(state).toBe('active');
  });
});
