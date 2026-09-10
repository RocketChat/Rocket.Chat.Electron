const invoke = jest.fn();

jest.mock('../../ipc/renderer', () => ({
  invoke: (...args: unknown[]) => invoke(...args),
}));

jest.mock('../../store', () => ({
  listen: jest.fn(() => jest.fn()),
}));

describe('userPresence/preload', () => {
  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('reports a transition once and does not repeat unchanged state', async () => {
    const { setUserPresenceDetection } = await import('../preload');
    const setUserOnline = jest.fn();

    invoke.mockResolvedValueOnce('active');
    invoke.mockResolvedValueOnce('idle');
    invoke.mockResolvedValueOnce('idle');

    setUserPresenceDetection({
      isAutoAwayEnabled: true,
      idleThreshold: 60000,
      setUserOnline,
    });

    // Initial poll.
    await Promise.resolve();
    await Promise.resolve();

    expect(setUserOnline).toHaveBeenCalledTimes(1);
    expect(setUserOnline).toHaveBeenNthCalledWith(1, true);

    // Second poll (transition to idle).
    await jest.advanceTimersByTimeAsync(2000);

    expect(setUserOnline).toHaveBeenCalledTimes(2);
    expect(setUserOnline).toHaveBeenNthCalledWith(2, false);

    // Third poll (still idle, no transition).
    await jest.advanceTimersByTimeAsync(2000);

    expect(setUserOnline).toHaveBeenCalledTimes(2);
  });

  it('reassertUserPresenceDetection reports unconditionally even without a transition', async () => {
    const { setUserPresenceDetection, reassertUserPresenceDetection } =
      await import('../preload');
    const setUserOnline = jest.fn();

    invoke.mockResolvedValueOnce('idle');

    setUserPresenceDetection({
      isAutoAwayEnabled: true,
      idleThreshold: 60000,
      setUserOnline,
    });

    await Promise.resolve();
    await Promise.resolve();

    expect(setUserOnline).toHaveBeenCalledTimes(1);
    expect(setUserOnline).toHaveBeenNthCalledWith(1, false);

    invoke.mockResolvedValueOnce('idle');

    reassertUserPresenceDetection();

    await Promise.resolve();
    await Promise.resolve();

    expect(setUserOnline).toHaveBeenCalledTimes(2);
    expect(setUserOnline).toHaveBeenNthCalledWith(2, false);
  });

  it('is a no-op when auto-away is disabled', async () => {
    const { setUserPresenceDetection, reassertUserPresenceDetection } =
      await import('../preload');
    const setUserOnline = jest.fn();

    setUserPresenceDetection({
      isAutoAwayEnabled: false,
      idleThreshold: 60000,
      setUserOnline,
    });

    await Promise.resolve();
    await Promise.resolve();

    reassertUserPresenceDetection();

    await Promise.resolve();
    await Promise.resolve();

    expect(invoke).not.toHaveBeenCalled();
    expect(setUserOnline).not.toHaveBeenCalled();
  });

  it('reassert routes through the newest setUserOnline after re-registration', async () => {
    const { setUserPresenceDetection, reassertUserPresenceDetection } =
      await import('../preload');
    const oldSetUserOnline = jest.fn();
    const newSetUserOnline = jest.fn();

    invoke.mockResolvedValueOnce('active');

    setUserPresenceDetection({
      isAutoAwayEnabled: true,
      idleThreshold: 60000,
      setUserOnline: oldSetUserOnline,
    });

    await Promise.resolve();
    await Promise.resolve();

    expect(oldSetUserOnline).toHaveBeenCalledTimes(1);

    invoke.mockResolvedValueOnce('active');

    setUserPresenceDetection({
      isAutoAwayEnabled: true,
      idleThreshold: 60000,
      setUserOnline: newSetUserOnline,
    });

    await Promise.resolve();
    await Promise.resolve();

    oldSetUserOnline.mockClear();
    newSetUserOnline.mockClear();

    invoke.mockResolvedValueOnce('active');

    reassertUserPresenceDetection();

    await Promise.resolve();
    await Promise.resolve();

    expect(oldSetUserOnline).not.toHaveBeenCalled();
    expect(newSetUserOnline).toHaveBeenCalledTimes(1);
    expect(newSetUserOnline).toHaveBeenCalledWith(true);
  });
});
