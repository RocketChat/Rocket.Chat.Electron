import { withoutUrlSecrets } from './withoutUrlSecrets';

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

  it('removes the credentials from an unparsable URL', () => {
    expect(withoutUrlSecrets('https://user:secret@bad host/path?x=1')).toBe(
      'https://bad host/path'
    );
    expect(withoutUrlSecrets('//user:secret@bad host/path?x=1')).toBe(
      '//bad host/path'
    );
  });
});
