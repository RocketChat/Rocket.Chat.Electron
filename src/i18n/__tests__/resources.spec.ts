import resources from '../resources';

describe('i18n/resources', () => {
  it('exposes loaders for all supported languages', () => {
    expect(Object.keys(resources).sort()).toEqual(
      [
        'de-DE',
        'en',
        'es',
        'fi',
        'fr',
        'hu',
        'it-IT',
        'ja',
        'no',
        'pl',
        'pt-BR',
        'ru',
        'sv',
        'tr-TR',
        'uk-UA',
        'zh-CN',
        'zh-TW',
      ].sort()
    );
  });

  it('loads English resources as a non-empty object', async () => {
    const en = await resources.en();
    expect(en).toEqual(expect.any(Object));
    expect(Object.keys(en as object).length).toBeGreaterThan(0);
  });

  it('loads a sample of non-English locales', async () => {
    const [de, pt, ja] = await Promise.all([
      resources['de-DE'](),
      resources['pt-BR'](),
      resources.ja(),
    ]);
    expect(de).toEqual(expect.any(Object));
    expect(pt).toEqual(expect.any(Object));
    expect(ja).toEqual(expect.any(Object));
  });
});
