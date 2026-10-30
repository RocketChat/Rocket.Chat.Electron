export const MAX_QUERY_TOKENS = 16;

// Built with the constructor: the TypeScript target is older than the
// Unicode property escapes, but the Electron runtime supports them.
const NON_WORD = new RegExp('[^\\p{L}\\p{N}]+', 'u');

export const queryWords = (text: string): string[] =>
  text.normalize('NFKC').split(NON_WORD).filter(Boolean);

// Turns raw user input into a safe FTS5 MATCH expression. Each word becomes
// a quoted prefix term, so FTS5 operators in the input are plain text.
// Returns '' when the input has no words. The caller must not run MATCH then.
// Throws above MAX_QUERY_TOKENS words: a MATCH without the other words would
// find messages that lack them. The bridge refuses such a query first.
export const toMatch = (text: string): string => {
  const words = queryWords(text);
  if (words.length > MAX_QUERY_TOKENS) {
    throw new RangeError(`query has more than ${MAX_QUERY_TOKENS} words`);
  }
  return words.map((token) => `"${token.replaceAll('"', '""')}"*`).join(' ');
};
