import { collectSettingSearchTexts } from '../searchIndex';
import type { Translate } from '../searchIndex';

const DICTIONARY: Record<string, unknown> = {
  'settings.options.themeAppearance': {
    title: 'Theme',
    description: 'App color theme.',
    auto: 'Match system',
    light: 'Light',
    dark: 'Dark',
  },
  'settings.certificates': 'Certificates',
  'settings.options.empty': {},
  'settings.options.shortcut': {
    title: 'Global call shortcut',
    reservedByApp: '{{accelerator}} is already used.',
  },
};

const t: Translate = (key) => (key in DICTIONARY ? DICTIONARY[key] : key);

describe('collectSettingSearchTexts', () => {
  it('indexes a setting title and its option labels', () => {
    const entry = collectSettingSearchTexts(
      t,
      'settings.options.themeAppearance'
    );

    expect(entry.title).toBe('Theme');
    expect(entry.texts).toEqual(
      expect.arrayContaining(['Theme', 'Match system', 'Light', 'Dark'])
    );
  });

  it('indexes the description too, for substring searches', () => {
    const entry = collectSettingSearchTexts(
      t,
      'settings.options.themeAppearance'
    );

    // Prose is indexed but matched by containment, not subsequence — see
    // `matchesSearchText`.
    expect(entry.texts).toContain('App color theme.');
  });

  it('skips interpolated runtime messages', () => {
    const entry = collectSettingSearchTexts(t, 'settings.options.shortcut');

    expect(entry.texts).toContain('Global call shortcut');
    expect(entry.texts).not.toContain('{{accelerator}} is already used.');
  });

  it('handles a plain string key', () => {
    const entry = collectSettingSearchTexts(t, 'settings.certificates');

    expect(entry).toEqual({
      title: 'Certificates',
      texts: ['Certificates'],
    });
  });

  it('falls back to the key when a namespace has no title', () => {
    const entry = collectSettingSearchTexts(t, 'settings.options.empty');

    expect(entry.title).toBe('settings.options.empty');
    expect(entry.texts).toEqual([]);
  });

  it('survives a missing key rather than throwing', () => {
    const entry = collectSettingSearchTexts(t, 'settings.options.nope');

    expect(entry.title).toBe('settings.options.nope');
    expect(entry.texts).toEqual(['settings.options.nope']);
  });
});
