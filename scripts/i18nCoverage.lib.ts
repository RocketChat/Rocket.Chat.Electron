import { execFileSync } from 'child_process';

type TranslationTree = { [key: string]: unknown };

const I18N_DIR = 'src/i18n';

const PLURAL_SUFFIX = /_(zero|one|two|few|many|other)$/;

export const flattenKeys = (tree: TranslationTree, prefix = ''): string[] =>
  Object.entries(tree).flatMap(([key, value]) => {
    const path = prefix ? `${prefix}.${key}` : key;
    return value && typeof value === 'object' && !Array.isArray(value)
      ? flattenKeys(value as TranslationTree, path)
      : [path];
  });

// The locales the app can load are the keys of the object that
// `src/i18n/resources.ts` exports, each with the file that its loader imports.
// A locale file without a loader there never reaches a user, so it is not
// checked.
export const parseLoadedLocales = (
  resourcesSource: string
): { locale: string; file: string }[] =>
  [
    ...resourcesSource.matchAll(
      /^\s*'([\w-]+)':[^\n]*import\('\.\/([\w-]+\.i18n\.json)'\)/gm
    ),
  ]
    .map(([, locale, file]) => ({ locale, file }))
    .filter(({ locale }) => locale !== 'en');

const pluralCategories = (locale: string): string[] =>
  new Intl.PluralRules(locale).resolvedOptions().pluralCategories;

// i18next resolves `key` with `count` to `key_<category>`, and the categories
// differ by language: Japanese has only `other`, Russian also needs `few` and
// `many`. So a new plural key needs the forms that each locale's language
// uses, not the forms that English uses.
const requiredKeys = (
  addedKeys: string[],
  englishKeys: Set<string>,
  locale: string
): string[] => {
  const required = new Set<string>();
  for (const key of addedKeys) {
    const base = key.replace(PLURAL_SUFFIX, '');
    const isPlural = base !== key && englishKeys.has(`${base}_other`);
    if (isPlural) {
      pluralCategories(locale).forEach((category) =>
        required.add(`${base}_${category}`)
      );
    } else {
      required.add(key);
    }
  }
  return [...required];
};

export type CoverageInput = {
  baseEnglish: TranslationTree;
  english: TranslationTree;
  locales: Record<string, TranslationTree>;
};

// Returns, for each locale, the keys added to English since the base that the
// locale does not translate. A locale with nothing missing is left out.
export const findUncoveredKeys = ({
  baseEnglish,
  english,
  locales,
}: CoverageInput): Record<string, string[]> => {
  const baseKeys = new Set(flattenKeys(baseEnglish));
  const englishKeys = new Set(flattenKeys(english));
  const addedKeys = [...englishKeys].filter((key) => !baseKeys.has(key));

  const uncovered: Record<string, string[]> = {};
  for (const [locale, tree] of Object.entries(locales)) {
    const localeKeys = new Set(flattenKeys(tree));
    const missing = requiredKeys(addedKeys, englishKeys, locale).filter(
      (key) => !localeKeys.has(key)
    );
    if (missing.length > 0) {
      uncovered[locale] = missing;
    }
  }
  return uncovered;
};

// Returns, for each locale, the plural forms that its language uses but that
// the locale leaves out of a plural key it does translate. i18next asks for
// `key_many` when the count is in the `many` category, and a missing form
// shows the English text. A plural key that the locale does not translate at
// all is a missing key, not a plural gap, so it is not reported here.
export const findIncompletePlurals = ({
  english,
  locales,
}: Omit<CoverageInput, 'baseEnglish'>): Record<string, string[]> => {
  const pluralBases = flattenKeys(english)
    .filter((key) => key.endsWith('_other'))
    .map((key) => key.slice(0, -'_other'.length));

  const incomplete: Record<string, string[]> = {};
  for (const [locale, tree] of Object.entries(locales)) {
    const localeKeys = new Set(flattenKeys(tree));
    const categories = pluralCategories(locale);
    const missing = pluralBases.flatMap((base) => {
      const forms = categories.map((category) => `${base}_${category}`);
      const translated = forms.some((form) => localeKeys.has(form));
      return translated ? forms.filter((form) => !localeKeys.has(form)) : [];
    });
    if (missing.length > 0) {
      incomplete[locale] = missing;
    }
  }
  return incomplete;
};

const git = (args: string[]): string =>
  execFileSync('git', args, {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    maxBuffer: 16 * 1024 * 1024,
  }).trim();

// The newest release tag before `ref`. `ref^` skips a tag on `ref` itself, so
// a run on the tagged commit compares against the release before it.
export const findBaseTag = (ref: string): string =>
  git(['describe', '--tags', '--abbrev=0', '--match', '[0-9]*', `${ref}^`]);

const readJsonAtRef = (ref: string, path: string): TranslationTree =>
  JSON.parse(git(['show', `${ref}:${path}`])) as TranslationTree;

export type CoverageReport = {
  baseRef: string;
  headRef: string;
  uncovered: Record<string, string[]>;
  incompletePlurals: Record<string, string[]>;
};

export const hasCoverageGaps = ({
  uncovered,
  incompletePlurals,
}: CoverageReport): boolean =>
  Object.keys(uncovered).length > 0 ||
  Object.keys(incompletePlurals).length > 0;

export const checkI18nCoverage = ({
  headRef = 'HEAD',
  baseRef = findBaseTag(headRef),
}: {
  headRef?: string;
  baseRef?: string;
} = {}): CoverageReport => {
  const resources = git(['show', `${headRef}:${I18N_DIR}/resources.ts`]);
  const locales = Object.fromEntries(
    parseLoadedLocales(resources).map(({ locale, file }) => [
      locale,
      readJsonAtRef(headRef, `${I18N_DIR}/${file}`),
    ])
  );
  const english = readJsonAtRef(headRef, `${I18N_DIR}/en.i18n.json`);
  const uncovered = findUncoveredKeys({
    baseEnglish: readJsonAtRef(baseRef, `${I18N_DIR}/en.i18n.json`),
    english,
    locales,
  });

  // A new plural key already shows in `uncovered`. Keep only the older ones.
  const incompletePlurals = Object.fromEntries(
    Object.entries(findIncompletePlurals({ english, locales }))
      .map(([locale, keys]): [string, string[]] => [
        locale,
        keys.filter((key) => !uncovered[locale]?.includes(key)),
      ])
      .filter(([, keys]) => keys.length > 0)
  );

  return { baseRef, headRef, uncovered, incompletePlurals };
};

const formatGaps = (gaps: Record<string, string[]>): string[] =>
  Object.entries(gaps).flatMap(([locale, keys]) => [
    `  ${locale} (${keys.length}):`,
    ...keys.map((key) => `    ${key}`),
  ]);

export const formatCoverageReport = (report: CoverageReport): string => {
  const { baseRef, headRef, uncovered, incompletePlurals } = report;
  if (!hasCoverageGaps(report)) {
    return `Every English key added since ${baseRef} is translated, with every plural form, in every loaded locale.`;
  }
  const sections: string[] = [];
  if (Object.keys(uncovered).length > 0) {
    sections.push(
      `English keys added between ${baseRef} and ${headRef} that a loaded locale does not translate:`,
      ...formatGaps(uncovered)
    );
  }
  if (Object.keys(incompletePlurals).length > 0) {
    sections.push(
      `Plural forms that a loaded locale's language uses but the locale does not translate:`,
      ...formatGaps(incompletePlurals)
    );
  }
  sections.push(
    `Add these keys to each listed locale file in src/i18n/, then run the release again.`
  );
  return sections.join('\n');
};
