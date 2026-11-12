import {
  findUncoveredKeys,
  flattenKeys,
  formatCoverageReport,
  parseLoadedLocales,
} from './i18nCoverage.lib';

describe('flattenKeys', () => {
  it('joins nested keys with dots', () => {
    expect(flattenKeys({ a: { b: 'x', c: { d: 'y' } }, e: 'z' })).toEqual([
      'a.b',
      'a.c.d',
      'e',
    ]);
  });
});

describe('parseLoadedLocales', () => {
  it('lists the loaders of resources.ts except English', () => {
    const source = `export default {
  'de-DE': (): Promise<Resource> => import('./de-DE.i18n.json'),
  'en': (): Promise<Resource> => import('./en.i18n.json'),
  'ja': (): Promise<Resource> => import('./ja.i18n.json'),
} as const;`;

    expect(parseLoadedLocales(source)).toEqual(['de-DE', 'ja']);
  });
});

describe('findUncoveredKeys', () => {
  const baseEnglish = { menu: { quit: 'Quit' } };

  it('ignores keys that existed before the base', () => {
    expect(
      findUncoveredKeys({
        baseEnglish,
        english: { menu: { quit: 'Quit' } },
        locales: { 'de-DE': {} },
      })
    ).toEqual({});
  });

  it('reports a new key that a locale does not translate', () => {
    expect(
      findUncoveredKeys({
        baseEnglish,
        english: { menu: { quit: 'Quit', reload: 'Reload' } },
        locales: {
          'de-DE': { menu: { reload: 'Neu laden' } },
          'fr': { menu: {} },
        },
      })
    ).toEqual({ fr: ['menu.reload'] });
  });

  it('requires the plural forms of each locale language', () => {
    const english = {
      menu: {
        quit: 'Quit',
        count_one: '{{count}} item',
        count_other: '{{count}} items',
      },
    };

    expect(
      findUncoveredKeys({
        baseEnglish,
        english,
        locales: {
          ja: { menu: { count_other: '{{count}} 件' } },
          ru: {
            menu: {
              count_one: '{{count}} элемент',
              count_other: '{{count}} элемента',
            },
          },
        },
      })
    ).toEqual({ ru: ['menu.count_few', 'menu.count_many'] });
  });

  it('treats an underscore key without an _other sibling as a plain key', () => {
    expect(
      findUncoveredKeys({
        baseEnglish,
        english: { menu: { quit: 'Quit', step_one: 'First step' } },
        locales: { ja: { menu: {} } },
      })
    ).toEqual({ ja: ['menu.step_one'] });
  });
});

describe('formatCoverageReport', () => {
  it('lists the missing keys per locale', () => {
    expect(
      formatCoverageReport({
        baseRef: '4.19.0',
        headRef: 'HEAD',
        uncovered: { fr: ['menu.reload'] },
      })
    ).toContain('  fr (1):\n    menu.reload');
  });
});
