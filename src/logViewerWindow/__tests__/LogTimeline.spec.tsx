import '@testing-library/jest-dom';
import { fireEvent, render, screen } from '@testing-library/react';

import type { Surfaces } from '../../ui/windowChrome/appearance';
import { LogTimeline } from '../LogTimeline';
import { buildTimeline, resolveRange } from '../timeline';
import type { TimeRange } from '../timeline';
import type { LogEntryType } from '../types';

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

const surfaces = {
  card: '#000',
  divider: '#000',
} as unknown as Surfaces;

const makeEntry = (offsetMs: number): LogEntryType => ({
  id: `entry-${offsetMs}`,
  timestamp: new Date(offsetMs).toISOString(),
  level: 'info',
  contextTags: [],
  context: '',
  message: 'message',
  raw: 'raw',
  searchText: 'message ',
  rawLower: 'raw',
});

const entries: LogEntryType[] = Array.from({ length: 20 }, (_unused, index) =>
  makeEntry(index * 1000)
);

const renderTimeline = (selectedRange: TimeRange | null = null) => {
  const onSelectRange = jest.fn();
  render(
    <LogTimeline
      entries={entries}
      surfaces={surfaces}
      selectedRange={selectedRange}
      onSelectRange={onSelectRange}
    />
  );
  return { onSelectRange };
};

describe('LogTimeline keyboard interaction', () => {
  it('exposes range slider semantics', () => {
    renderTimeline();
    const slider = screen.getByRole('slider');
    expect(slider).toHaveAttribute('aria-valuemin', '0');
    expect(slider).toHaveAttribute('aria-valuemax');
    expect(slider).toHaveAttribute('aria-valuenow');
    expect(slider).toHaveAttribute('tabindex', '0');
  });

  it('selects a single bucket on ArrowLeft from the default (last bucket) position', () => {
    const { onSelectRange } = renderTimeline();
    const slider = screen.getByRole('slider');

    fireEvent.keyDown(slider, { key: 'ArrowLeft' });

    expect(onSelectRange).toHaveBeenCalledTimes(1);
    const range = onSelectRange.mock.calls[0][0] as TimeRange;
    expect(range.startTime).toBeLessThan(range.endTime);
  });

  it('extends the range with Shift+ArrowLeft from an existing selection', () => {
    const { buckets } = buildTimeline(entries, 96);
    const anchorRange = resolveRange(buckets, 10, 10) as TimeRange;
    const { onSelectRange } = renderTimeline(anchorRange);
    const slider = screen.getByRole('slider');

    fireEvent.keyDown(slider, { key: 'ArrowLeft', shiftKey: true });

    expect(onSelectRange).toHaveBeenCalledTimes(1);
    const range = onSelectRange.mock.calls[0][0] as TimeRange;
    expect(range.startTime).toBeLessThanOrEqual(anchorRange.startTime);
    expect(range.endTime).toBe(anchorRange.endTime);
  });

  it('jumps to the first bucket on Home and the last bucket on End', () => {
    const { onSelectRange } = renderTimeline();
    const slider = screen.getByRole('slider');

    fireEvent.keyDown(slider, { key: 'Home' });
    const homeRange = onSelectRange.mock.calls[0][0] as TimeRange;
    expect(homeRange.startTime).toBeLessThanOrEqual(
      new Date(entries[0].timestamp).getTime()
    );

    fireEvent.keyDown(slider, { key: 'End' });
    const endRange = onSelectRange.mock.calls[1][0] as TimeRange;
    expect(endRange.endTime).toBeGreaterThanOrEqual(
      new Date(entries[entries.length - 1].timestamp).getTime()
    );
  });

  it('clears the selection on Escape', () => {
    const anchorRange: TimeRange = {
      startTime: new Date(entries[5].timestamp).getTime(),
      endTime: new Date(entries[8].timestamp).getTime(),
    };
    const { onSelectRange } = renderTimeline(anchorRange);
    const slider = screen.getByRole('slider');

    fireEvent.keyDown(slider, { key: 'Escape' });

    expect(onSelectRange).toHaveBeenCalledWith(null);
  });
});
