import { Box } from '@rocket.chat/fuselage';
import type { ReactNode } from 'react';

export type FilterSectionProps = {
  title: string;
  children: ReactNode;
};

/** Sidebar group heading, styled after a native inspector section label. */
export const FilterSection = ({ title, children }: FilterSectionProps) => (
  <Box marginBlockEnd='x20'>
    <Box
      fontScale='micro'
      color='annotation'
      marginBlockEnd='x8'
      style={{ textTransform: 'uppercase', letterSpacing: '0.06em' }}
    >
      {title}
    </Box>
    {children}
  </Box>
);
