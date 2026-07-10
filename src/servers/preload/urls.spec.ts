import {
  getServerUrl,
  setServerUrl,
  setUrlResolver,
  getAbsoluteUrl,
} from './urls';

describe('servers/preload urls', () => {
  it('stores and returns the server URL', () => {
    setServerUrl('https://server.local');
    expect(getServerUrl()).toBe('https://server.local');
  });

  it('stores and delegates URL resolution', () => {
    const resolve = jest.fn(
      (relativePath?: string) => `https://cdn.local/${relativePath}`
    );
    setUrlResolver(resolve);

    expect(getAbsoluteUrl('path/file.png')).toBe(
      'https://cdn.local/path/file.png'
    );
    expect(resolve).toHaveBeenCalledWith('path/file.png');
  });
});
