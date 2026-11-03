import { createServerFailure } from './serverFailure';

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
