import { Box } from '@rocket.chat/fuselage';
import type { ReactNode } from 'react';

import { SectionLabel } from './SectionLabel';
import { TextButton } from './TextButton';

export type FilterSectionProps = {
  title: string;
  children: ReactNode;
  /**
   * Resets this section to "everything selected". Rendered only when something
   * is deselected, so the control appears exactly where the narrowing happened
   * instead of one shared button at the bottom of the sidebar.
   */
  selectAllLabel?: string;
  onSelectAll?: () => void;
  canSelectAll?: boolean;
};

/** Sidebar group heading, styled after a native inspector section label. */
export const FilterSection = ({
  title,
  children,
  selectAllLabel,
  onSelectAll,
  canSelectAll = false,
}: FilterSectionProps) => (
  <Box marginBlockEnd='x20'>
    <Box
      display='flex'
      alignItems='center'
      justifyContent='space-between'
      marginBlockEnd='x8'
      // Reserve the row height whether or not the button is showing, so the
      // sections do not shift as filters are toggled.
      style={{ minHeight: '20px' }}
    >
      <SectionLabel>{title}</SectionLabel>
      {canSelectAll && onSelectAll && (
        <TextButton onClick={onSelectAll}>{selectAllLabel}</TextButton>
      )}
    </Box>
    {children}
  </Box>
);
