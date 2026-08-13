/**
 * Subsequence fuzzy matching, the kind a command palette uses: every character
 * of the query must appear in the text in order, but not adjacently — so "trwin"
 * finds "Transparent window effect".
 *
 * Deliberately not a ranked search. The sidebar only needs to decide whether a
 * section is worth showing, and a settings window has tens of entries, not
 * thousands, so scoring would add a knob without changing what the reader sees.
 */
const normalize = (value: string): string =>
  value
    .toLowerCase()
    // Fold accents so "vídeo" matches "video" and vice versa.
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

export const fuzzyMatch = (query: string, text: string): boolean => {
  const needle = normalize(query).replace(/\s+/g, '');
  if (needle === '') return true;

  const haystack = normalize(text);
  if (haystack === '') return false;

  let cursor = 0;
  for (const character of needle) {
    const found = haystack.indexOf(character, cursor);
    if (found === -1) return false;
    cursor = found + 1;
  }

  return true;
};

/**
 * Longest text still treated as a label. Above this it is prose, and prose is
 * where subsequence matching falls apart: any short query's characters appear
 * in order somewhere in a sentence, so "vibr" would "match" every description
 * in the app.
 */
const LABEL_MAX_LENGTH = 32;

/**
 * How search decides whether a query hits one piece of settings text.
 *
 * Labels get fuzzy matching, so "trwin" finds "Transparent window effect".
 * Descriptions get plain containment, so "vibrancy" still finds the setting
 * whose description mentions it, without the sentence matching everything else.
 */
export const matchesSearchText = (query: string, text: string): boolean => {
  if (text.length <= LABEL_MAX_LENGTH) {
    return fuzzyMatch(query, text);
  }

  const needle = normalize(query).trim();
  return needle === '' || normalize(text).includes(needle);
};

/** The entries of `texts` that the query matches, in their original order. */
export const fuzzyFilter = (query: string, texts: string[]): string[] => {
  if (query.trim() === '') return [];
  return texts.filter((text) => fuzzyMatch(query, text));
};
