export interface ITextSegment {
  text: string;
  matched: boolean;
}

export type TextSegment = ITextSegment;

const escapeRegExp = (value: string): string =>
  value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export const splitTextForHighlight = (
  text: string,
  query: string
): TextSegment[] => {
  if (!query) {
    return [{ text, matched: false }];
  }

  const regex = new RegExp(`(${escapeRegExp(query)})`, 'gi');
  const parts = text.split(regex);

  if (parts.length === 1) {
    return [{ text, matched: false }];
  }

  const lowerQuery = query.toLowerCase();
  return parts
    .filter((part) => part !== '')
    .map((part) => ({
      text: part,
      matched: part.toLowerCase() === lowerQuery,
    }));
};

export const MAX_COLLAPSED_MESSAGE_LINES = 6;

export const splitMessageForCollapse = (
  message: string
): { visibleLines: string[]; hiddenLineCount: number } => {
  const lines = message.split('\n');
  if (lines.length <= MAX_COLLAPSED_MESSAGE_LINES) {
    return { visibleLines: lines, hiddenLineCount: 0 };
  }

  return {
    visibleLines: lines.slice(0, MAX_COLLAPSED_MESSAGE_LINES),
    hiddenLineCount: lines.length - MAX_COLLAPSED_MESSAGE_LINES,
  };
};
