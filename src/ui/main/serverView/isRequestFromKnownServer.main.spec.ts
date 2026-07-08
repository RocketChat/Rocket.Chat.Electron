import { isRequestFromKnownServer } from './index';

describe('isRequestFromKnownServer', () => {
  const servers = [
    { url: 'https://chat.example.com' },
    { url: 'https://other.example.com/' },
  ];

  it('allows a requesting URL whose origin matches a configured server', () => {
    expect(
      isRequestFromKnownServer('https://chat.example.com/some/path', servers)
    ).toBe(true);
  });

  it('allows a match even when the configured server URL has a trailing slash', () => {
    expect(
      isRequestFromKnownServer('https://other.example.com/x', servers)
    ).toBe(true);
  });

  it('denies a requesting URL whose origin is not configured', () => {
    expect(isRequestFromKnownServer('https://evil.example.com', servers)).toBe(
      false
    );
  });

  it('denies when requestingUrl is undefined', () => {
    expect(isRequestFromKnownServer(undefined, servers)).toBe(false);
  });

  it('denies when requestingUrl is not a valid URL', () => {
    expect(isRequestFromKnownServer('not-a-url', servers)).toBe(false);
  });

  it('denies when there are no configured servers', () => {
    expect(isRequestFromKnownServer('https://chat.example.com', [])).toBe(
      false
    );
  });

  it('skips a configured server with an empty url without throwing', () => {
    expect(
      isRequestFromKnownServer('https://chat.example.com', [
        { url: '' },
        ...servers,
      ])
    ).toBe(true);
  });

  it('skips a configured server with an invalid url without throwing', () => {
    expect(
      isRequestFromKnownServer('https://chat.example.com', [
        { url: 'not-a-url' },
        ...servers,
      ])
    ).toBe(true);
  });
});
