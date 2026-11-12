import { readFileSync } from 'fs';
import { join } from 'path';

import { findIncompletePlurals, parseLoadedLocales } from './i18nCoverage.lib';

const i18nDirectory = join(__dirname, '..', 'src', 'i18n');

const readJson = (file: string) =>
  JSON.parse(readFileSync(join(i18nDirectory, file), 'utf8'));

// The release guard checks plural forms too, but only when a release is cut.
// This spec makes every pull request keep the plural forms complete.
describe('locale files', () => {
  it('translate every plural form of their language', () => {
    const locales = Object.fromEntries(
      parseLoadedLocales(
        readFileSync(join(i18nDirectory, 'resources.ts'), 'utf8')
      ).map(({ locale, file }) => [locale, readJson(file)])
    );

    expect(
      findIncompletePlurals({ english: readJson('en.i18n.json'), locales })
    ).toEqual({});
  });
});
