import { Box } from '@rocket.chat/fuselage';
import type { ReactNode } from 'react';

import { SectionLabel } from './SectionLabel';
import type { Surfaces } from './appearance';

export type DayHeaderProps = {
  label: string;
  surfaces: Surfaces;
  /** Blur the sticky fill only over a vibrant window. */
  blurred?: boolean;
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
  blurred = false,
}: DayHeaderProps) => (
  <Box
    display='flex'
    alignItems='center'
    justifyContent='space-between'
    paddingInline='x12'
    paddingBlock='x4'
    style={{
      ...(sticky ? { position: 'sticky', insetBlockStart: 0, zIndex: 1 } : {}),
      backgroundColor: surfaces.sticky,
      ...(blurred ? { backdropFilter: 'blur(12px)' } : {}),
      borderBlockEnd: `1px solid ${surfaces.divider}`,
    }}
  >
    <SectionLabel>{label}</SectionLabel>
    {trailing !== undefined && (
      <Box flexShrink={0} style={{ fontVariantNumeric: 'tabular-nums' }}>
        {trailing}
      </Box>
    )}
  </Box>
);
