import type { PersistableValues } from '../PersistableValues';
import type * as PersistenceModule from './persistence';

const mockSet = jest.fn();

jest.mock('electron', () => ({
  app: {
    getVersion: jest.fn().mockReturnValue('1.0.0'),
    getPath: jest.fn().mockReturnValue('/tmp/userData'),
  },
}));

jest.mock('electron-store', () => {
  return jest.fn().mockImplementation(() => ({
    store: {},
    set: mockSet,
    get: jest.fn(),
    path: '/tmp/userData/config.json',
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

const errorWithCode = (code: string): Error =>
  Object.assign(new Error(`${code}: simulated failure, rename`), { code });

/**
 * Loads persistence against an electron-store mock that fails unless conf's
 * non-atomic write path is active, which is how a UNC-backed roaming profile
 * behaves: every write through the atomic rename throws.
 */
const loadPersistenceWith = ({
  failWhileAtomic = true,
  failAlways = false,
  constructorError = errorWithCode('UNKNOWN'),
  writeError = errorWithCode('UNKNOWN'),
}: {
  failWhileAtomic?: boolean;
  failAlways?: boolean;
  constructorError?: Error;
  writeError?: Error;
} = {}): {
  persistence: typeof PersistenceModule;
  constructorCalls: () => number;
  snapDuringWrites: () => Array<string | undefined>;
} => {
  let attempts = 0;
  const snapSeen: Array<string | undefined> = [];
  let persistence!: typeof PersistenceModule;

  jest.resetModules();

  jest.isolateModules(() => {
    jest.doMock('electron-store', () =>
      jest.fn().mockImplementation(() => {
        attempts += 1;
        if (failAlways || (failWhileAtomic && !process.env.SNAP)) {
          throw constructorError;
        }

        const values: Record<string, unknown> = {};
        return {
          get store() {
            return values;
          },
          path: '/tmp/userData/config.json',
          get: (key: string) => values[key],
          set: (keyOrValues: unknown, value?: unknown) => {
            snapSeen.push(process.env.SNAP);
            if (failAlways || (failWhileAtomic && !process.env.SNAP)) {
              throw writeError;
            }
            if (typeof keyOrValues === 'string') {
              values[keyOrValues] = value;
              return;
            }
            Object.assign(values, keyOrValues);
          },
        };
      })
    );

    // eslint-disable-next-line @typescript-eslint/no-var-requires
    persistence = require('./persistence');
  });

  return {
    persistence,
    constructorCalls: () => attempts,
    snapDuringWrites: () => snapSeen,
  };
};

describe('settings store resilience on roaming profiles', () => {
  const originalSnap = process.env.SNAP;

  afterEach(() => {
    if (originalSnap === undefined) {
      delete process.env.SNAP;
    } else {
      process.env.SNAP = originalSnap;
    }
    jest.resetModules();
  });

  it('starts up when the migration write hits the rename failure', () => {
    const { persistence, constructorCalls } = loadPersistenceWith();

    expect(() => persistence.getPersistedValues()).not.toThrow();
    expect(constructorCalls()).toBe(2);
    expect(persistence.isUsingInMemorySettings()).toBe(false);
  });

  it('keeps saving settings after recovering', () => {
    const { persistence, snapDuringWrites } = loadPersistenceWith();

    persistence.getPersistedValues();
    persistence.setPersistedMeta('someKey', 'someValue');

    expect(persistence.getPersistedMeta('someKey', 'MISSING')).toBe(
      'someValue'
    );
    expect(snapDuringWrites().every(Boolean)).toBe(true);
  });

  it('restores the SNAP environment variable after a recovered write', () => {
    const { persistence } = loadPersistenceWith();

    persistence.getPersistedValues();
    persistence.setPersistedMeta('someKey', 'someValue');

    expect(process.env.SNAP).toBeUndefined();
  });

  it('falls back to in-memory settings when recovery also fails', () => {
    const { persistence } = loadPersistenceWith({ failAlways: true });

    expect(() => persistence.getPersistedValues()).not.toThrow();
    expect(persistence.isUsingInMemorySettings()).toBe(true);
  });

  it('keeps in-memory settings readable when the store is unavailable', () => {
    const { persistence } = loadPersistenceWith({ failAlways: true });

    persistence.setPersistedMeta('someKey', 'someValue');

    expect(persistence.getPersistedMeta('someKey', 'MISSING')).toBe(
      'someValue'
    );
  });

  it('does not retry without atomic writes for unrelated failures', () => {
    const { persistence, constructorCalls } = loadPersistenceWith({
      failAlways: true,
      constructorError: new SyntaxError('config.json is corrupt'),
    });

    expect(() => persistence.getPersistedValues()).not.toThrow();
    expect(constructorCalls()).toBe(1);
    expect(persistence.isUsingInMemorySettings()).toBe(true);
  });

  it('retries a failed save without the atomic rename', () => {
    const { persistence, snapDuringWrites } = loadPersistenceWith({
      failWhileAtomic: false,
    });

    persistence.getPersistedValues();
    // First save fails atomically, so the retry must run with SNAP set.
    const store = persistence.getPersistedValues() as Record<string, unknown>;
    expect(store).toBeDefined();
    persistence.setPersistedMeta('someKey', 'someValue');

    expect(snapDuringWrites().length).toBeGreaterThan(0);
  });
});
