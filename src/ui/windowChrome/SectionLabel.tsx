import { Box } from '@rocket.chat/fuselage';
import type { ReactNode } from 'react';

export type SectionLabelProps = {
  children: ReactNode;
};

/** Uppercase inspector-style label used by sidebar sections and list headers. */
export const SectionLabel = ({ children }: SectionLabelProps) => (
  <Box
    fontScale='micro'
    color='annotation'
    withTruncatedText
    style={{ textTransform: 'uppercase', letterSpacing: '0.06em' }}
  >
    {children}
  </Box>
);
