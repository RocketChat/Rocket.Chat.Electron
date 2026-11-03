import { createServerFailure, withoutUrlSecrets } from './serverFailure';

jest.mock('electron', () => ({
  app: { getPath: jest.fn(() => '/logs') },
}));

describe('withoutUrlSecrets', () => {
  it('removes the query string, the fragment and the credentials', () => {
    expect(
      withoutUrlSecrets(
        'https://user:secret@chat.example.com/_oauth/google?code=abc&state=xyz#token=123'
      )
    ).toBe('https://chat.example.com/_oauth/google');
  });

  it('keeps a URL that has nothing to remove', () => {
    expect(withoutUrlSecrets('https://chat.example.com/home')).toBe(
      'https://chat.example.com/home'
    );
  });

  it('cuts an unparsable URL at its query string or fragment', () => {
    expect(withoutUrlSecrets('not a url?token=abc')).toBe('not a url');
    expect(withoutUrlSecrets('not a url#token=abc')).toBe('not a url');
  });
});

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
