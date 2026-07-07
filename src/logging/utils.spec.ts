const debugMock = jest.fn();
const errorMock = jest.fn();

jest.mock('electron-log', () => ({
  debug: (...args: any[]) => debugMock(...args),
  error: (...args: any[]) => errorMock(...args),
}));

const { logExecutionTime } = require('./utils');

describe('logging/utils', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('logs and returns sync values', () => {
    const result = logExecutionTime('sync', () => 5);

    expect(result).toBe(5);
    expect(debugMock).toHaveBeenCalledWith('Starting execution of sync');
    expect(debugMock).toHaveBeenLastCalledWith(
      expect.stringMatching(/^Completed execution of sync in \d+ms$/)
    );
  });

  it('logs completion and returns awaited values for async functions', async () => {
    const result = await logExecutionTime('async', async () => 11);

    expect(result).toBe(11);
    expect(debugMock).toHaveBeenCalledWith('Starting execution of async');
    expect(debugMock).toHaveBeenLastCalledWith(
      expect.stringMatching(/^Completed execution of async in \d+ms$/)
    );
  });

  it('logs failures for rejected async functions and rethrows', async () => {
    const promise = logExecutionTime(
      'rejecting',
      () => Promise.reject(new Error('nope'))
    );

    await expect(promise).rejects.toThrow('nope');
    expect(errorMock).toHaveBeenCalledWith(
      expect.stringMatching(/^Failed execution of rejecting in \d+ms$/),
      expect.any(Error)
    );
  });

  it('logs failures for sync exceptions and rethrows', () => {
    expect(() =>
      logExecutionTime('throws', () => {
        throw new Error('kaboom');
      })
    ).toThrow('kaboom');
    expect(errorMock).toHaveBeenCalledWith(
      expect.stringMatching(/^Failed execution of throws in \d+ms$/),
      expect.any(Error)
    );
  });
});
