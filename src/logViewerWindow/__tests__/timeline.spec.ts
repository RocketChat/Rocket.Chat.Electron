import {
  buildTimeline,
  getBarHeightPercent,
  isWithinRange,
  resolveRange,
} from '../timeline';
import type { LogEntryType, LogLevel } from '../types';

const entry = (timestamp: string, level: LogLevel = 'info'): LogEntryType => ({
  id: `e-${timestamp}-${level}`,
  timestamp,
  level,
  contextTags: ['main'],
  context: 'main',
  message: 'message',
  raw: `[${timestamp}] [${level}] [main] message`,
  searchText: 'message main',
  rawLower: `[${timestamp}] [${level}] [main] message`.toLowerCase(),
});

describe('buildTimeline', () => {
  it('returns nothing for no entries or a bad bucket count', () => {
    expect(buildTimeline([], 10).buckets).toEqual([]);
    expect(
      buildTimeline([entry('2026-08-07 10:00:00.000')], 0).buckets
    ).toEqual([]);
  });

  it('spans oldest to newest regardless of input order', () => {
    // Entries arrive newest-first, as the viewer holds them.
    const timeline = buildTimeline(
      [entry('2026-08-07 12:00:00.000'), entry('2026-08-07 10:00:00.000')],
      4
    );

    expect(new Date(timeline.startTime).getHours()).toBe(10);
    expect(new Date(timeline.endTime).getHours()).toBe(12);
    expect(timeline.buckets).toHaveLength(4);
  });

  it('distributes entries across buckets oldest first', () => {
    const timeline = buildTimeline(
      [
        entry('2026-08-07 10:40:00.000'),
        entry('2026-08-07 10:20:00.000'),
        entry('2026-08-07 10:00:00.000'),
      ],
      2
    );

    // Span is 40min over 2 buckets: [10:00,10:20) holds 10:00, and
    // [10:20,10:40] holds both 10:20 and the closing 10:40.
    expect(timeline.buckets.map((bucket) => bucket.total)).toEqual([1, 2]);
  });

  it('keeps every entry, including the newest which lands on the edge', () => {
    const timeline = buildTimeline(
      [
        entry('2026-08-07 11:00:00.000'),
        entry('2026-08-07 10:30:00.000'),
        entry('2026-08-07 10:00:00.000'),
      ],
      3
    );

    const counted = timeline.buckets.reduce(
      (sum, bucket) => sum + bucket.total,
      0
    );
    expect(counted).toBe(3);
  });

  it('collapses a single instant into one bucket', () => {
    const timeline = buildTimeline(
      [entry('2026-08-07 10:00:00.000'), entry('2026-08-07 10:00:00.000')],
      50
    );

    expect(timeline.buckets).toHaveLength(1);
    expect(timeline.buckets[0].total).toBe(2);
    expect(timeline.peak).toBe(2);
  });

  it('counts levels per bucket', () => {
    const timeline = buildTimeline(
      [
        entry('2026-08-07 10:00:00.100', 'error'),
        entry('2026-08-07 10:00:00.050', 'error'),
        entry('2026-08-07 10:00:00.000', 'warn'),
      ],
      1
    );

    expect(timeline.buckets[0].countsByLevel).toEqual({ error: 2, warn: 1 });
  });

  it('records the newest entry index of each bucket for scroll-to', () => {
    const entries = [
      entry('2026-08-07 12:00:00.000'),
      entry('2026-08-07 11:00:00.000'),
      entry('2026-08-07 10:00:00.000'),
    ];
    const timeline = buildTimeline(entries, 2);

    // Oldest bucket holds only 10:00 (index 2); the newer bucket holds 11:00
    // and 12:00, whose newest is index 0.
    expect(timeline.buckets[0].newestIndex).toBe(2);
    expect(timeline.buckets[1].newestIndex).toBe(0);
  });

  it('skips unparseable timestamps instead of stretching the span', () => {
    const timeline = buildTimeline(
      [
        entry('2026-08-07 10:00:01.000'),
        entry('not a timestamp'),
        entry('2026-08-07 10:00:00.000'),
      ],
      2
    );

    expect(timeline.endTime - timeline.startTime).toBe(1000);
    const counted = timeline.buckets.reduce(
      (sum, bucket) => sum + bucket.total,
      0
    );
    expect(counted).toBe(2);
  });

  it('reports nothing when no timestamp can be parsed', () => {
    expect(buildTimeline([entry('nonsense')], 5).buckets).toEqual([]);
  });

  it('reports the peak bucket total for scaling', () => {
    const timeline = buildTimeline(
      [
        entry('2026-08-07 10:00:00.900'),
        entry('2026-08-07 10:00:00.800'),
        entry('2026-08-07 10:00:00.700'),
        entry('2026-08-07 10:00:00.000'),
      ],
      2
    );

    expect(timeline.peak).toBe(3);
  });
});

describe('getBarHeightPercent', () => {
  it('is zero for an empty bucket', () => {
    expect(getBarHeightPercent(0, 10)).toBe(0);
  });

  it('scales against the peak', () => {
    expect(getBarHeightPercent(10, 10)).toBe(100);
    expect(getBarHeightPercent(5, 10)).toBe(50);
  });

  it('keeps a sparse bucket visible', () => {
    expect(getBarHeightPercent(1, 1000)).toBe(6);
  });

  it('handles a peak of zero without dividing by it', () => {
    expect(getBarHeightPercent(3, 0)).toBe(0);
  });
});

describe('resolveRange', () => {
  const timeline = buildTimeline(
    [
      entry('2026-08-07 10:00:03.000'),
      entry('2026-08-07 10:00:02.000'),
      entry('2026-08-07 10:00:01.000'),
      entry('2026-08-07 10:00:00.000'),
    ],
    4
  );
  const { buckets } = timeline;

  it('spans the two indices', () => {
    const range = resolveRange(buckets, 1, 2);
    expect(range).toEqual({
      startTime: buckets[1].startTime,
      endTime: buckets[2].endTime,
    });
  });

  it('is the same range dragged in either direction', () => {
    expect(resolveRange(buckets, 3, 0)).toEqual(resolveRange(buckets, 0, 3));
  });

  it('covers a single bucket when the drag never moved', () => {
    expect(resolveRange(buckets, 2, 2)).toEqual({
      startTime: buckets[2].startTime,
      endTime: buckets[2].endTime,
    });
  });

  it('refuses indices outside the timeline', () => {
    expect(resolveRange(buckets, 0, 99)).toBeNull();
    expect(resolveRange(buckets, -1, 1)).toBeNull();
    expect(resolveRange([], 0, 0)).toBeNull();
  });
});

describe('isWithinRange', () => {
  const range = { startTime: 1000, endTime: 2000 };

  it('includes both ends', () => {
    expect(isWithinRange(1000, range)).toBe(true);
    expect(isWithinRange(2000, range)).toBe(true);
  });

  it('excludes times outside', () => {
    expect(isWithinRange(999, range)).toBe(false);
    expect(isWithinRange(2001, range)).toBe(false);
  });

  it('excludes an unparseable timestamp', () => {
    expect(isWithinRange(NaN, range)).toBe(false);
  });
});
