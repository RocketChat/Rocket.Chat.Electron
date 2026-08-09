import { Box } from '@rocket.chat/fuselage';
import type { ReactNode } from 'react';

import type { Surfaces } from './appearance';

export type DayHeaderProps = {
  label: string;
  surfaces: Surfaces;
  /** Trailing content, such as how many entries the day holds. */
  trailing?: ReactNode;
  /**
   * Pin to the top of the scroller. Virtual lists render these as group headers
   * and stick them themselves, so those pass `false`.
   */
  sticky?: boolean;
};

/**
 * Day heading for a run of rows, so the date stays readable at any scroll
 * position rather than only where the day changes.
 */
export const DayHeader = ({
  label,
  surfaces,
  trailing,
  sticky = false,
}: DayHeaderProps) => (
  <Box
    display='flex'
    alignItems='center'
    justifyContent='space-between'
    paddingInline='x12'
    paddingBlock='x4'
    fontScale='micro'
    color='hint'
    style={{
      ...(sticky ? { position: 'sticky', insetBlockStart: 0, zIndex: 1 } : {}),
      backgroundColor: surfaces.sticky,
      backdropFilter: 'blur(12px)',
      borderBlockEnd: `1px solid ${surfaces.divider}`,
      textTransform: 'uppercase',
      letterSpacing: '0.06em',
    }}
  >
    <Box withTruncatedText>{label}</Box>
    {trailing !== undefined && (
      <Box flexShrink={0} style={{ fontVariantNumeric: 'tabular-nums' }}>
        {trailing}
      </Box>
    )}
  </Box>
);
