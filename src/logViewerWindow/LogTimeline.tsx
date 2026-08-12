import { Box, IconButton } from '@rocket.chat/fuselage';
import type {
  KeyboardEvent as ReactKeyboardEvent,
  MouseEvent as ReactMouseEvent,
} from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import type { Surfaces } from '../ui/windowChrome/appearance';
import { TimelineBar } from './TimelineBar';
import { TIMELINE_BUCKET_COUNT, TIMELINE_PLOT_HEIGHT } from './constants';
import { TIMELINE_PLOT_CLASS, TIMELINE_SELECTION_CLASS } from './styles';
import type { TimeRange, TimelineBucket } from './timeline';
import { buildTimeline, resolveRange } from './timeline';
import type { LogEntryType } from './types';

const formatTime = (time: number): string =>
  new Date(time).toLocaleTimeString();

export type LogTimelineProps = {
  /**
   * Entries matching every filter *except* the time range. Excluding the range
   * is what lets the chart keep showing the whole span while a slice of it is
   * selected — filtering it too would collapse the chart onto the selection and
   * leave no way back.
   */
  entries: LogEntryType[];
  surfaces: Surfaces;
  selectedRange: TimeRange | null;
  onSelectRange: (range: TimeRange | null) => void;
};

/**
 * Distribution of matching entries over the file's time span, oldest on the
 * left. Dragging across the plot selects a time range; a plain click selects the
 * single slice under the pointer.
 */
export const LogTimeline = ({
  entries,
  surfaces,
  selectedRange,
  onSelectRange,
}: LogTimelineProps) => {
  const { t } = useTranslation();
  const plotRef = useRef<HTMLDivElement>(null);

  const timeline = useMemo(
    () => buildTimeline(entries, TIMELINE_BUCKET_COUNT),
    [entries]
  );

  /** Range being dragged right now, drawn on top of any committed selection. */
  const [dragRange, setDragRange] = useState<TimeRange | null>(null);

  // Handlers are bound imperatively on mousedown and read the live buckets from
  // a ref, so they never need rebinding and never capture a stale span.
  const bucketsRef = useRef<TimelineBucket[]>(timeline.buckets);
  useEffect(() => {
    bucketsRef.current = timeline.buckets;
  }, [timeline.buckets]);

  const releaseDragRef = useRef<(() => void) | null>(null);
  useEffect(() => () => releaseDragRef.current?.(), []);

  /**
   * Anchor bucket for Shift+Arrow range extension. Reset whenever the
   * selection is replaced by something the keyboard didn't just build, so a
   * fresh mouse drag or an external change doesn't extend from a stale anchor.
   */
  const keyAnchorRef = useRef<number | null>(null);

  /**
   * Bucket whose startTime a given time belongs to. Bucket boundaries are
   * shared (one bucket's endTime is the next one's startTime), so this has to
   * favour the later bucket on an exact boundary hit — matching how
   * `buildTimeline` slots entries — or the anchor of a range ending exactly on
   * a boundary would resolve one bucket too early.
   */
  const bucketIndexAtStart = useCallback((time: number): number => {
    const buckets = bucketsRef.current;
    for (let index = buckets.length - 1; index >= 0; index -= 1) {
      if (time >= buckets[index].startTime) return index;
    }
    return 0;
  }, []);

  /** Bucket whose endTime a given time belongs to, favouring the earlier bucket. */
  const bucketIndexAtEnd = useCallback((time: number): number => {
    const buckets = bucketsRef.current;
    for (let index = 0; index < buckets.length; index += 1) {
      if (time <= buckets[index].endTime) return index;
    }
    return Math.max(0, buckets.length - 1);
  }, []);

  const bucketFromClientX = useCallback((clientX: number): number => {
    const rect = plotRef.current?.getBoundingClientRect();
    const count = bucketsRef.current.length;
    if (!rect || rect.width === 0 || count === 0) return 0;
    const ratio = (clientX - rect.left) / rect.width;
    return Math.min(count - 1, Math.max(0, Math.floor(ratio * count)));
  }, []);

  /**
   * Binding move/up listeners here rather than in an effect keyed on drag state
   * matters: an effect only runs after the next render, so a drag fast enough to
   * finish within the same task would lose its own mouseup and stay stuck.
   */
  const handleMouseDown = useCallback(
    (event: ReactMouseEvent<HTMLElement>) => {
      if (event.button !== 0 || bucketsRef.current.length === 0) return;
      event.preventDefault();
      keyAnchorRef.current = null;

      const anchor = bucketFromClientX(event.clientX);
      setDragRange(resolveRange(bucketsRef.current, anchor, anchor));

      const release = (): void => {
        window.removeEventListener('mousemove', handleMove);
        window.removeEventListener('mouseup', handleUp);
        window.removeEventListener('keydown', handleCancel);
        releaseDragRef.current = null;
      };

      function handleMove(moveEvent: MouseEvent): void {
        const cursor = bucketFromClientX(moveEvent.clientX);
        setDragRange(resolveRange(bucketsRef.current, anchor, cursor));
      }

      function handleUp(upEvent: MouseEvent): void {
        release();
        setDragRange(null);
        const cursor = bucketFromClientX(upEvent.clientX);
        const range = resolveRange(bucketsRef.current, anchor, cursor);
        if (range) onSelectRange(range);
      }

      function handleCancel(keyEvent: KeyboardEvent): void {
        if (keyEvent.key !== 'Escape') return;
        release();
        setDragRange(null);
      }

      window.addEventListener('mousemove', handleMove);
      window.addEventListener('mouseup', handleUp);
      window.addEventListener('keydown', handleCancel);
      releaseDragRef.current = release;
    },
    [bucketFromClientX, onSelectRange]
  );

  const handleClearRange = useCallback(() => {
    keyAnchorRef.current = null;
    onSelectRange(null);
  }, [onSelectRange]);

  const handleKeyDown = useCallback(
    (event: ReactKeyboardEvent<HTMLElement>) => {
      const buckets = bucketsRef.current;
      const lastIndex = buckets.length - 1;
      if (lastIndex < 0) return;

      if (event.key === 'Escape') {
        keyAnchorRef.current = null;
        onSelectRange(null);
        return;
      }

      const activeIndex =
        selectedRange !== null
          ? bucketIndexAtEnd(selectedRange.endTime)
          : lastIndex;
      const anchorIndex =
        selectedRange !== null
          ? keyAnchorRef.current ?? bucketIndexAtStart(selectedRange.startTime)
          : activeIndex;

      let nextCursor = activeIndex;
      switch (event.key) {
        case 'ArrowLeft':
          nextCursor = Math.max(0, activeIndex - 1);
          break;
        case 'ArrowRight':
          nextCursor = Math.min(lastIndex, activeIndex + 1);
          break;
        case 'Home':
          nextCursor = 0;
          break;
        case 'End':
          nextCursor = lastIndex;
          break;
        default:
          return;
      }

      event.preventDefault();

      const nextAnchor = event.shiftKey ? anchorIndex : nextCursor;
      keyAnchorRef.current = nextAnchor;

      const range = resolveRange(buckets, nextAnchor, nextCursor);
      if (range) onSelectRange(range);
    },
    [bucketIndexAtEnd, bucketIndexAtStart, onSelectRange, selectedRange]
  );

  if (timeline.buckets.length === 0) {
    return null;
  }

  const span = timeline.endTime - timeline.startTime || 1;
  const toPercent = (time: number): number =>
    Math.min(100, Math.max(0, ((time - timeline.startTime) / span) * 100));

  const highlight = dragRange ?? selectedRange;
  const highlightLeft = highlight ? toPercent(highlight.startTime) : 0;
  const highlightWidth = highlight
    ? Math.max(0.6, toPercent(highlight.endTime) - highlightLeft)
    : 0;

  const activeBucketIndex = highlight
    ? bucketIndexAtEnd(highlight.endTime)
    : timeline.buckets.length - 1;

  return (
    <Box
      display='flex'
      flexDirection='column'
      flexShrink={0}
      paddingInline='x12'
      paddingBlock='x8'
      style={{
        backgroundColor: surfaces.card,
        borderBlockEnd: `1px solid ${surfaces.divider}`,
        userSelect: 'none',
      }}
    >
      <Box
        ref={plotRef}
        className={TIMELINE_PLOT_CLASS}
        role='slider'
        tabIndex={0}
        aria-label={t('logViewer.timeline.hint')}
        aria-valuemin={0}
        aria-valuemax={Math.max(0, timeline.buckets.length - 1)}
        aria-valuenow={activeBucketIndex}
        aria-valuetext={
          selectedRange
            ? `${formatTime(selectedRange.startTime)} – ${formatTime(
                selectedRange.endTime
              )}`
            : t('logViewer.timeline.label')
        }
        display='flex'
        alignItems='flex-end'
        onMouseDown={handleMouseDown}
        onKeyDown={handleKeyDown}
        style={{
          position: 'relative',
          height: `${TIMELINE_PLOT_HEIGHT}px`,
          cursor: 'col-resize',
        }}
      >
        {timeline.buckets.map((bucket) => (
          <TimelineBar
            key={bucket.startTime}
            bucket={bucket}
            peak={timeline.peak}
            isDimmed={
              highlight !== null &&
              (bucket.endTime <= highlight.startTime ||
                bucket.startTime >= highlight.endTime)
            }
            title={`${formatTime(bucket.startTime)} – ${formatTime(
              bucket.endTime
            )} · ${t('logViewer.fileInfo.entries', { count: bucket.total })}`}
          />
        ))}
        {highlight && (
          <Box
            className={TIMELINE_SELECTION_CLASS}
            style={{
              left: `${highlightLeft}%`,
              width: `${highlightWidth}%`,
            }}
          />
        )}
      </Box>

      <Box
        display='flex'
        alignItems='center'
        justifyContent='space-between'
        marginBlockStart='x4'
        fontScale='micro'
        color='annotation'
        style={{ fontVariantNumeric: 'tabular-nums' }}
      >
        <Box>{formatTime(timeline.startTime)}</Box>
        {selectedRange ? (
          <Box display='flex' alignItems='center' color='info'>
            <Box>
              {formatTime(selectedRange.startTime)} –{' '}
              {formatTime(selectedRange.endTime)}
            </Box>
            <Box marginInlineStart='x4'>
              <IconButton
                mini
                icon='cross'
                title={t('logViewer.timeline.clearRange')}
                aria-label={t('logViewer.timeline.clearRange')}
                onClick={handleClearRange}
              />
            </Box>
          </Box>
        ) : (
          <Box>{t('logViewer.timeline.peak', { count: timeline.peak })}</Box>
        )}
        <Box>{formatTime(timeline.endTime)}</Box>
      </Box>
    </Box>
  );
};
