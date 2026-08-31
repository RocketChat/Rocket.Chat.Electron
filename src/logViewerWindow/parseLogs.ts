import { type LogEntryType, parseLogLevel } from './types';

const LOG_LINE_REGEX = /^\[([^\]]+)\]\s+\[([^\]]+)\]\s*(.*)$/;
const CONTEXT_RUN_REGEX = /^((?:\[[^\]]*\]\s*)+)(.*)$/;
const CONTEXT_TAG_REGEX = /\[([^\]]*)\]/g;

const buildEntryDerivedFields = (
  entry: Pick<LogEntryType, 'message' | 'context' | 'raw'>
): Pick<LogEntryType, 'searchText' | 'rawLower'> => ({
  searchText: `${entry.message} ${entry.context}`.toLowerCase(),
  rawLower: entry.raw.toLowerCase(),
});

/**
 * Parse `[timestamp] [level] [tag] [tag] message` lines into entries, newest
 * first. Lines that do not open a new entry are folded into the previous
 * message, which is how stack traces stay attached to the error that threw.
 *
 * Context tags are kept as a list rather than a joined string: tags such as
 * `renderer:webview` or `localhost:3000` are meaningful units, and splitting the
 * joined form on whitespace would shred any tag that contains a space.
 *
 * `idPrefix` keeps ids unique across calls — tail reads are parsed separately
 * and prepended, so a shared prefix would collide with the initial read's ids.
 */
export const parseLogLines = (
  logText: string,
  idPrefix = 'log'
): LogEntryType[] => {
  if (!logText || logText.trim() === '') {
    return [];
  }

  const lines = logText.split(/\r?\n/);
  const entries: LogEntryType[] = [];
  let currentEntry: LogEntryType | null = null;

  lines.forEach((line) => {
    const match = line.match(LOG_LINE_REGEX);

    if (match) {
      const [, timestamp, level, rest] = match;

      const contextMatch = rest.match(CONTEXT_RUN_REGEX);
      const contextTags = contextMatch
        ? Array.from(contextMatch[1].matchAll(CONTEXT_TAG_REGEX), ([, tag]) =>
            tag.trim()
          ).filter(Boolean)
        : [];
      const message = contextMatch ? contextMatch[2] : rest;

      if (currentEntry) {
        entries.push(currentEntry);
      }

      const parsedMessage = message.trim();
      const context = contextTags.join(' ');

      currentEntry = {
        id: `${idPrefix}-${entries.length}`,
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

/** Calendar day of an entry, used to group the list under date dividers. */
export const getEntryDay = (timestamp: string): string => {
  const parsed = new Date(timestamp);
  if (!isNaN(parsed.getTime())) {
    return parsed.toDateString();
  }
  return timestamp.slice(0, 10);
};

/** Drops the date from `2026-08-07 18:28:43.920`, keeping the wall clock time. */
export const getEntryTime = (timestamp: string): string => {
  const [, time] = timestamp.split(' ');
  return time || timestamp;
};

export const countBy = <T>(
  items: T[],
  getKeys: (item: T) => string[]
): Record<string, number> => {
  const counts: Record<string, number> = {};
  items.forEach((item) => {
    getKeys(item).forEach((key) => {
      counts[key] = (counts[key] ?? 0) + 1;
    });
  });
  return counts;
};
