import { getServerInitials } from './getServerInitials';

describe('getServerInitials', () => {
  it('returns undefined when title is undefined', () => {
    expect(
      getServerInitials(undefined, 'https://chat.example')
    ).toBeUndefined();
  });

  it('uses hostname when title contains the full URL', () => {
    expect(
      getServerInitials('https://open.rocket.chat', 'https://open.rocket.chat')
    ).toBe('OR');
  });

  it('takes up to two alphanumeric initials from the title', () => {
    expect(getServerInitials('Acme Corp', 'https://chat.example')).toBe('AC');
    expect(getServerInitials('OnlyOne', 'https://chat.example')).toBe('O');
  });

  it('ignores non-alphanumeric separators', () => {
    expect(getServerInitials('Foo-Bar_Baz', 'https://chat.example')).toBe('FB');
  });
});
