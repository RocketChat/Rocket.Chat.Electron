import type { LogEntryType, LogLevel } from './types';

export type TimelineBucket = {
  /** Inclusive start of the bucket's time range, epoch ms. */
  startTime: number;
  /** Exclusive end of the range, except for the last bucket. */
  endTime: number;
  total: number;
  countsByLevel: Partial<Record<LogLevel, number>>;
  /**
   * Index of this bucket's newest entry in the source array. The list is
   * newest-first, so this is the smallest index that landed here — clicking a
   * bucket can scroll straight to it.
   */
  newestIndex: number;
};

export type Timeline = {
  buckets: TimelineBucket[];
  startTime: number;
  endTime: number;
  /** Highest bucket total, for scaling bar heights. */
  peak: number;
};

export const EMPTY_TIMELINE: Timeline = {
  buckets: [],
  startTime: 0,
  endTime: 0,
  peak: 0,
};

/**
 * Buckets entries into equal time slices, oldest first, so they can be drawn as
 * a distribution over the file's time span.
 *
 * Entries arrive newest-first and their timestamps are log text, so anything
 * unparseable is skipped rather than dragged to the epoch — one bad line would
 * otherwise stretch the span across decades and flatten every real bar.
 */
export const buildTimeline = (
  entries: LogEntryType[],
  bucketCount: number
): Timeline => {
  if (entries.length === 0 || bucketCount < 1) {
    return EMPTY_TIMELINE;
  }

  const times = new Array<number>(entries.length);
  let startTime = Infinity;
  let endTime = -Infinity;

  entries.forEach((entry, index) => {
    const time = new Date(entry.timestamp).getTime();
    times[index] = time;
    if (isNaN(time)) return;
    if (time < startTime) startTime = time;
    if (time > endTime) endTime = time;
  });

  if (!isFinite(startTime) || !isFinite(endTime)) {
    return EMPTY_TIMELINE;
  }

  // A single instant still deserves one bar rather than a division by zero.
  const span = endTime - startTime;
  const resolvedCount = span === 0 ? 1 : bucketCount;
  const bucketSpan = span === 0 ? 1 : span / resolvedCount;

  const buckets: TimelineBucket[] = Array.from(
    { length: resolvedCount },
    (_unused, index) => ({
      startTime: startTime + index * bucketSpan,
      endTime: startTime + (index + 1) * bucketSpan,
      total: 0,
      countsByLevel: {},
      newestIndex: -1,
    })
  );

  let peak = 0;

  entries.forEach((entry, index) => {
    const time = times[index];
    if (isNaN(time)) return;

    // The newest entry lands exactly on endTime, which is one past the last
    // bucket's start, so clamp it back into that bucket.
    const slot = Math.min(
      resolvedCount - 1,
      Math.floor((time - startTime) / bucketSpan)
    );
    const bucket = buckets[slot];

    bucket.total += 1;
    bucket.countsByLevel[entry.level] =
      (bucket.countsByLevel[entry.level] ?? 0) + 1;
    if (bucket.newestIndex === -1 || index < bucket.newestIndex) {
      bucket.newestIndex = index;
    }
    if (bucket.total > peak) peak = bucket.total;
  });

  return { buckets, startTime, endTime, peak };
};

export type TimeRange = {
  startTime: number;
  endTime: number;
};

/**
 * Time range covering two bucket indices, in either drag direction. Returns null
 * when the indices fall outside the timeline, so a stale drag cannot commit a
 * range built from undefined buckets.
 */
export const resolveRange = (
  buckets: TimelineBucket[],
  anchorIndex: number,
  cursorIndex: number
): TimeRange | null => {
  const first = buckets[Math.min(anchorIndex, cursorIndex)];
  const last = buckets[Math.max(anchorIndex, cursorIndex)];
  if (!first || !last) return null;
  return { startTime: first.startTime, endTime: last.endTime };
};

/** Whether a timestamp falls inside a selected range, ends inclusive. */
export const isWithinRange = (time: number, range: TimeRange): boolean =>
  !isNaN(time) && time >= range.startTime && time <= range.endTime;

/** Bar height as a percentage, keeping any non-empty bucket visible. */
export const getBarHeightPercent = (total: number, peak: number): number => {
  if (total === 0 || peak <= 0) return 0;
  return Math.max(6, Math.round((total / peak) * 100));
};
