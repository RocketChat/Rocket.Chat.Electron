import type { PersistableValues } from '../PersistableValues';
import type * as PersistenceModule from './persistence';

const mockSet = jest.fn();

jest.mock('electron', () => ({
  app: {
    getVersion: jest.fn().mockReturnValue('1.0.0'),
  },
}));

jest.mock('electron-store', () => {
  return jest.fn().mockImplementation(() => ({
    store: {},
    set: mockSet,
    get: jest.fn(),
  }));
});

const value = (n: number): PersistableValues =>
  ({ marker: n }) as unknown as PersistableValues;

describe('persistValues throttling', () => {
  let persistValues: typeof PersistenceModule.persistValues;
  let flushPersistedValues: typeof PersistenceModule.flushPersistedValues;

  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(0);
    mockSet.mockClear();
    jest.resetModules();
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const persistence: typeof PersistenceModule = require('./persistence');
    persistValues = persistence.persistValues;
    flushPersistedValues = persistence.flushPersistedValues;
  });

  afterEach(() => {
    flushPersistedValues();
    jest.useRealTimers();
  });

  it('writes immediately when outside the throttle window', () => {
    jest.advanceTimersByTime(2000);
    persistValues(value(1));

    expect(mockSet).toHaveBeenCalledTimes(1);
    expect(mockSet).toHaveBeenCalledWith(value(1));
  });

  it('writes immediately when the throttle interval has elapsed exactly', () => {
    jest.advanceTimersByTime(2000);
    persistValues(value(1));
    mockSet.mockClear();

    jest.advanceTimersByTime(1000);
    persistValues(value(2));

    expect(mockSet).toHaveBeenCalledTimes(1);
    expect(mockSet).toHaveBeenCalledWith(value(2));
  });

  it('coalesces rapid successive calls and persists only the final values after the trailing interval', () => {
    jest.advanceTimersByTime(2000);
    persistValues(value(1));
    mockSet.mockClear();

    jest.advanceTimersByTime(100);
    persistValues(value(2));
    jest.advanceTimersByTime(200);
    persistValues(value(3));
    jest.advanceTimersByTime(200);
    persistValues(value(4));

    expect(mockSet).not.toHaveBeenCalled();

    jest.advanceTimersByTime(500);

    expect(mockSet).toHaveBeenCalledTimes(1);
    expect(mockSet).toHaveBeenCalledWith(value(4));
  });

  it('does not drop the final write when it lands inside the throttle window', () => {
    jest.advanceTimersByTime(2000);
    persistValues(value(1));
    mockSet.mockClear();

    jest.advanceTimersByTime(200);
    persistValues(value(2));

    jest.advanceTimersByTime(800);

    expect(mockSet).toHaveBeenCalledTimes(1);
    expect(mockSet).toHaveBeenCalledWith(value(2));
  });

  it('flush writes pending values immediately without waiting for the trailing timer', () => {
    jest.advanceTimersByTime(2000);
    persistValues(value(1));
    mockSet.mockClear();

    jest.advanceTimersByTime(200);
    persistValues(value(2));

    expect(mockSet).not.toHaveBeenCalled();

    flushPersistedValues();

    expect(mockSet).toHaveBeenCalledTimes(1);
    expect(mockSet).toHaveBeenCalledWith(value(2));
  });

  it('flush is a no-op when there is no pending write', () => {
    jest.advanceTimersByTime(2000);
    persistValues(value(1));
    mockSet.mockClear();

    flushPersistedValues();

    expect(mockSet).not.toHaveBeenCalled();
  });
});
