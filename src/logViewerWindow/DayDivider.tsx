import { Box } from '@rocket.chat/fuselage';

import type { Surfaces } from './appearance';

export type DayDividerProps = {
  label: string;
  surfaces: Surfaces;
};

/**
 * Day header for a run of entries. Rendered as a virtual list group header, so
 * it stays pinned to the top of the viewport while its own day scrolls past —
 * the date is readable at any scroll position, not only where the day changes.
 */
export const DayDivider = ({ label, surfaces }: DayDividerProps) => (
  <Box
    display='flex'
    alignItems='center'
    paddingInline='x12'
    paddingBlock='x4'
    fontScale='micro'
    color='hint'
    style={{
      backgroundColor: surfaces.sticky,
      backdropFilter: 'blur(12px)',
      borderBlockEnd: `1px solid ${surfaces.divider}`,
      textTransform: 'uppercase',
      letterSpacing: '0.06em',
    }}
  >
    {label}
  </Box>
);
