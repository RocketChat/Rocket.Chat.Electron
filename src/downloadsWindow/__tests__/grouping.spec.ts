import type { Download } from '../../downloads/common';
import { formatDayLabel, groupDownloadsByDay } from '../grouping';

const at = (iso: string, itemId = 1): Download =>
  ({
    itemId,
    startTime: new Date(iso).getTime(),
    fileName: `f-${itemId}`,
  }) as Download;

const LABELS = { today: 'Today', yesterday: 'Yesterday', unknown: 'Earlier' };

describe('groupDownloadsByDay', () => {
  it('returns nothing for an empty list', () => {
    expect(groupDownloadsByDay([])).toEqual([]);
  });

  it('groups consecutive downloads sharing a day', () => {
    const groups = groupDownloadsByDay([
      at('2026-08-08T10:00:00', 1),
      at('2026-08-08T09:00:00', 2),
      at('2026-08-07T23:00:00', 3),
    ]);

    expect(groups).toHaveLength(2);
    expect(groups[0].items.map((d) => d.itemId)).toEqual([1, 2]);
    expect(groups[1].items.map((d) => d.itemId)).toEqual([3]);
  });

  it('preserves the incoming order rather than re-sorting', () => {
    const groups = groupDownloadsByDay([
      at('2026-08-07T10:00:00', 1),
      at('2026-08-08T10:00:00', 2),
    ]);

    expect(groups.map((g) => g.items[0].itemId)).toEqual([1, 2]);
  });

  it('keeps downloads with an unusable start time instead of dropping them', () => {
    const broken = { itemId: 9, startTime: NaN } as Download;
    const groups = groupDownloadsByDay([broken]);

    expect(groups).toHaveLength(1);
    expect(groups[0].day).toBe('');
    expect(groups[0].items).toEqual([broken]);
  });

  it('starts a new run when the day changes back and forth', () => {
    const groups = groupDownloadsByDay([
      at('2026-08-08T10:00:00', 1),
      at('2026-08-07T10:00:00', 2),
      at('2026-08-08T08:00:00', 3),
    ]);

    expect(groups).toHaveLength(3);
  });
});

describe('formatDayLabel', () => {
  // Built from local parts on purpose: grouping is by local calendar day, and
  // `new Date('2026-08-08')` would parse as UTC midnight and land on the
  // previous day in any negative-offset timezone.
  const now = new Date(2026, 7, 8, 12);

  it('names today and yesterday', () => {
    expect(
      formatDayLabel(new Date(2026, 7, 8).toDateString(), now, LABELS)
    ).toBe('Today');
    expect(
      formatDayLabel(new Date(2026, 7, 7).toDateString(), now, LABELS)
    ).toBe('Yesterday');
  });

  it('falls back to a full date for older days', () => {
    const label = formatDayLabel(
      new Date(2026, 7, 1).toDateString(),
      now,
      LABELS
    );
    expect(label).not.toBe('Today');
    expect(label).not.toBe('Yesterday');
    expect(label).toContain('2026');
  });

  it('labels downloads with no usable day', () => {
    expect(formatDayLabel('', now, LABELS)).toBe('Earlier');
  });
});
