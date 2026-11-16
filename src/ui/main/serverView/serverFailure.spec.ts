import {
  createServerFailure,
  createServerFailureTracker,
} from './serverFailure';

jest.mock('electron', () => ({
  app: { getPath: jest.fn(() => '/logs') },
}));

describe('createServerFailure', () => {
  it('adds the time and the logs path, and cleans the URL', () => {
    const failure = createServerFailure({
      kind: 'load-failed',
      errorCode: -105,
      errorDescription: 'ERR_NAME_NOT_RESOLVED',
      url: 'https://chat.example.com/?resumeToken=abc',
    });

    expect(failure).toEqual({
      kind: 'load-failed',
      errorCode: -105,
      errorDescription: 'ERR_NAME_NOT_RESOLVED',
      url: 'https://chat.example.com/',
      at: expect.any(String),
      logsPath: '/logs',
    });
    expect(new Date(failure.at).toISOString()).toBe(failure.at);
  });

  it('adds no URL when there is none', () => {
    expect(createServerFailure({ kind: 'unresponsive' })).not.toHaveProperty(
      'url'
    );
  });
});

describe('createServerFailureTracker', () => {
  beforeEach(() => {
    jest.useFakeTimers({ now: new Date('2026-11-09T10:00:00.000Z') });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('gives the first failure no since time', () => {
    const failures = createServerFailureTracker();

    expect(failures.create({ kind: 'unresponsive' })).not.toHaveProperty(
      'since'
    );
  });

  it('keeps the time of the first failure while the failures repeat', () => {
    const failures = createServerFailureTracker();
    failures.create({ kind: 'renderer-gone', reason: 'crashed' });

    jest.setSystemTime(new Date('2026-11-09T10:01:00.000Z'));
    const second = failures.create({ kind: 'load-failed', errorCode: -106 });

    expect(second).toMatchObject({
      kind: 'load-failed',
      at: '2026-11-09T10:01:00.000Z',
      since: '2026-11-09T10:00:00.000Z',
    });
  });

  it('starts a new series after the page loads', () => {
    const failures = createServerFailureTracker();
    failures.create({ kind: 'unresponsive' });
    failures.clear();

    jest.setSystemTime(new Date('2026-11-09T10:05:00.000Z'));

    expect(failures.create({ kind: 'unresponsive' })).not.toHaveProperty(
      'since'
    );
  });
});
