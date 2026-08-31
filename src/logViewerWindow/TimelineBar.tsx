import { Box } from '@rocket.chat/fuselage';

import { LEVEL_ACCENT, LOG_LEVELS } from './appearance';
import { TIMELINE_PLOT_HEIGHT } from './constants';
import type { TimelineBucket } from './timeline';
import { getBarHeightPercent } from './timeline';

export type TimelineBarProps = {
  bucket: TimelineBucket;
  peak: number;
  title: string;
  isDimmed: boolean;
};

/**
 * One time slice, stacked by level so a burst of errors stays visible inside an
 * otherwise busy period.
 *
 * Bars tile the plot exactly — the 1px gutter is padding inside each bar rather
 * than a flex gap — so the plot's width maps linearly onto bucket indices and
 * drag selection can resolve a pointer position without measuring each bar.
 */
export const TimelineBar = ({
  bucket,
  peak,
  title,
  isDimmed,
}: TimelineBarProps) => {
  const heightPercent = getBarHeightPercent(bucket.total, peak);

  return (
    <Box
      title={bucket.total === 0 ? undefined : title}
      style={{
        flex: '1 1 0',
        minWidth: 0,
        height: `${TIMELINE_PLOT_HEIGHT}px`,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'flex-end',
        paddingInline: '0.5px',
        opacity: isDimmed ? 0.3 : 1,
      }}
    >
      <Box
        style={{
          height: `${heightPercent}%`,
          display: 'flex',
          flexDirection: 'column',
          borderRadius: '1px',
          overflow: 'hidden',
        }}
      >
        {LOG_LEVELS.map((level) => {
          const count = bucket.countsByLevel[level] ?? 0;
          if (count === 0) return null;
          return (
            <Box
              key={level}
              style={{
                flexGrow: count,
                flexBasis: 0,
                minHeight: '1px',
                backgroundColor: LEVEL_ACCENT[level],
              }}
            />
          );
        })}
      </Box>
    </Box>
  );
};
