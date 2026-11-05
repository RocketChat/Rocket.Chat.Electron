import type {
  SettingAvailabilityContext,
  SettingsSectionDefinition,
} from './sections';

/** Minimal shape of i18next's `t`, so this stays testable without i18next. */
export type Translate = (
  key: string,
  options?: { returnObjects?: boolean }
) => unknown;

export type SettingSearchEntry = {
  /** What the row reports as the reason it matched. */
  title: string;
  /** Every string worth matching against. */
  texts: string[];
};

/**
 * Strings carrying interpolation are runtime messages ("{{accelerator}} is
 * already used…"), not something anyone searches for.
 */
const isSearchable = (value: string): boolean => !value.includes('{{');

/**
 * Expands a settings key into the text worth searching: the setting's own name,
 * its option labels and its description — so "light" finds Theme and "vibrancy"
 * finds the transparent window effect. `matchesSearchText` decides how strictly
 * each of those is matched.
 *
 * Taking the whole namespace rather than a hand-listed set of keys means a new
 * option becomes searchable the moment it is translated.
 */
export const collectSettingSearchTexts = (
  t: Translate,
  key: string
): SettingSearchEntry => {
  const resolved = t(key, { returnObjects: true });

  if (typeof resolved === 'string') {
    return { title: resolved, texts: [resolved] };
  }

  if (!resolved || typeof resolved !== 'object') {
    return { title: key, texts: [] };
  }

  const entries = Object.entries(resolved as Record<string, unknown>);
  const title = entries.find(([name]) => name === 'title')?.[1];

  const texts = entries
    .filter(
      ([, value]) => typeof value === 'string' && isSearchable(value as string)
    )
    .map(([, value]) => value as string);

  return {
    title: typeof title === 'string' ? title : key,
    texts,
  };
};

/**
 * The keys of a section that search may match: the ones the section renders
 * in this context. A hidden setting must not be a search result (CORE-2782).
 */
export const getSearchableSettingKeys = (
  section: Pick<
    SettingsSectionDefinition,
    'settingKeys' | 'settingAvailability'
  >,
  context: SettingAvailabilityContext
): string[] =>
  section.settingKeys.filter(
    (key) => section.settingAvailability?.[key]?.(context) ?? true
  );
