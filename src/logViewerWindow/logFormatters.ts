import type { LogEntryType } from './types';
import { parseLogLevel } from './types';

export const LOG_LINE_REGEX = /^\[([^\]]+)\]\s+\[([^\]]+)\]\s*(.*)$/;
export const CONTEXT_REGEX = /^(\[[^\]]+\](?:\s*\[[^\]]+\])*)\s*(.*)$/;

export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  const mb = kb / 1024;
  return `${mb.toFixed(1)} MB`;
};

const buildEntryDerivedFields = (
  entry: Pick<LogEntryType, 'message' | 'context' | 'raw'>
): Pick<LogEntryType, 'searchText' | 'rawLower'> => ({
  searchText: `${entry.message} ${entry.context}`.toLowerCase(),
  rawLower: entry.raw.toLowerCase(),
});

export const parseLogLines = (logText: string): LogEntryType[] => {
  if (!logText || logText.trim() === '') {
    return [];
  }
  const lines = logText.split(/\r?\n/).filter((line: string) => line.trim());
  const entries: LogEntryType[] = [];
  let currentEntry: LogEntryType | null = null;

  lines.forEach((line) => {
    const match = line.match(LOG_LINE_REGEX);

    if (match) {
      const [, timestamp, level, rest] = match;

      const contextMatch = rest.match(CONTEXT_REGEX);
      const contextTags = Array.from(
        (contextMatch?.[1] || '').matchAll(/\[([^\]]*)\]/g),
        ([, tag]) => tag.trim()
      ).filter(Boolean);
      const message = contextMatch?.[2] || rest;

      if (currentEntry) {
        entries.push(currentEntry);
      }

      const parsedMessage = message.trim();
      const context = contextTags.join(' ');

      currentEntry = {
        id: `log-${entries.length}`,
        timestamp,
        level: parseLogLevel(level),
        contextTags,
        context,
        message: parsedMessage,
        raw: line,
        ...buildEntryDerivedFields({
          message: parsedMessage,
          context,
          raw: line,
        }),
      };
    } else if (currentEntry && line.trim()) {
      currentEntry.message += `\n${line}`;
      currentEntry.raw += `\n${line}`;
      const derived = buildEntryDerivedFields(currentEntry);
      currentEntry.searchText = derived.searchText;
      currentEntry.rawLower = derived.rawLower;
    }
  });

  if (currentEntry) {
    entries.push(currentEntry);
  }

  return entries.reverse();
};
