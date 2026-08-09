import { fuzzyFilter, fuzzyMatch, matchesSearchText } from '../fuzzy';

describe('fuzzyMatch', () => {
  it('matches a plain substring', () => {
    expect(fuzzyMatch('theme', 'Theme')).toBe(true);
  });

  it('matches characters spread through the text, in order', () => {
    expect(fuzzyMatch('trwin', 'Transparent window effect')).toBe(true);
    expect(fuzzyMatch('hwacc', 'Hardware acceleration')).toBe(true);
  });

  it('rejects characters that appear out of order', () => {
    expect(fuzzyMatch('emeth', 'Theme')).toBe(false);
  });

  it('rejects characters that are not there at all', () => {
    expect(fuzzyMatch('zzz', 'Theme')).toBe(false);
  });

  it('ignores case and spaces in the query', () => {
    expect(fuzzyMatch('TRAY icon', 'Tray icon')).toBe(true);
    expect(fuzzyMatch('  workspace  ', 'Workspace switcher')).toBe(true);
  });

  it('folds accents both ways', () => {
    expect(fuzzyMatch('video', 'Vídeo chamadas')).toBe(true);
    expect(fuzzyMatch('vídeo', 'Video calls')).toBe(true);
  });

  it('treats an empty query as matching everything', () => {
    expect(fuzzyMatch('', 'anything')).toBe(true);
    expect(fuzzyMatch('   ', 'anything')).toBe(true);
  });

  it('never matches empty text with a real query', () => {
    expect(fuzzyMatch('a', '')).toBe(false);
  });

  it('does not reuse a character to satisfy the query twice', () => {
    // One "l" in the text cannot satisfy two in the query.
    expect(fuzzyMatch('ll', 'value')).toBe(false);
    expect(fuzzyMatch('ll', 'call')).toBe(true);
  });
});

describe('fuzzyFilter', () => {
  const texts = ['Theme', 'Tray icon', 'Workspace switcher'];

  it('keeps matching entries in their original order', () => {
    // "ic" is in "Tray icon" and in "switcher", but not in "Theme".
    expect(fuzzyFilter('ic', texts)).toEqual([
      'Tray icon',
      'Workspace switcher',
    ]);
  });

  it('narrows to a single entry when the query is specific', () => {
    expect(fuzzyFilter('them', texts)).toEqual(['Theme']);
  });

  it('returns nothing for a blank query, since nothing was searched for', () => {
    expect(fuzzyFilter('', texts)).toEqual([]);
    expect(fuzzyFilter('  ', texts)).toEqual([]);
  });
});

describe('matchesSearchText', () => {
  const LABEL = 'Transparent window effect';
  const PROSE =
    'Enable native vibrancy on app window, so the desktop shows through.';

  it('fuzzy matches short labels', () => {
    expect(matchesSearchText('trwin', LABEL)).toBe(true);
  });

  it('requires a real substring in prose', () => {
    expect(matchesSearchText('vibrancy', PROSE)).toBe(true);
  });

  it('does not let a subsequence match prose', () => {
    // Every one of these characters appears in order in the sentence, which is
    // exactly why prose cannot be fuzzy matched.
    expect(fuzzyMatch('vibr', PROSE)).toBe(true);
    expect(matchesSearchText('vibr', PROSE)).toBe(true);
    expect(matchesSearchText('enw', PROSE)).toBe(false);
  });

  it('is case and accent insensitive on both paths', () => {
    expect(matchesSearchText('VIBRANCY', PROSE)).toBe(true);
    expect(matchesSearchText('TRWIN', LABEL)).toBe(true);
  });
});
