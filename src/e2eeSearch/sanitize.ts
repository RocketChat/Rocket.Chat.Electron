export const MAX_QUERY_TOKENS = 16;

// Built with the constructor: the TypeScript target is older than the
// Unicode property escapes, but the Electron runtime supports them.
const NON_WORD = new RegExp('[^\\p{L}\\p{N}]+', 'u');

// Turns raw user input into a safe FTS5 MATCH expression. Each word becomes
// a quoted prefix term, so FTS5 operators in the input are plain text.
// Returns '' when the input has no words. The caller must not run MATCH then.
export const toMatch = (text: string): string =>
  text
    .normalize('NFKC')
    .split(NON_WORD)
    .filter(Boolean)
    .slice(0, MAX_QUERY_TOKENS)
    .map((token) => `"${token.replaceAll('"', '""')}"*`)
    .join(' ');
