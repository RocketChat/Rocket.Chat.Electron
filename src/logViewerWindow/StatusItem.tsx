import { Box, Icon } from '@rocket.chat/fuselage';
import type { ReactNode } from 'react';

export type StatusItemProps = {
  icon: 'hash' | 'file' | 'clock';
  children: ReactNode;
  title?: string;
};

/** One icon-and-value cell of the status bar. */
export const StatusItem = ({ icon, children, title }: StatusItemProps) => (
  <Box
    display='flex'
    alignItems='center'
    marginInlineEnd='x16'
    title={title}
    style={{ minWidth: 0 }}
  >
    <Icon name={icon} size='x12' />
    <Box marginInlineStart='x4' withTruncatedText>
      {children}
    </Box>
  </Box>
);
