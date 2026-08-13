import { Box, Icon } from '@rocket.chat/fuselage';
import type { Keys as IconName } from '@rocket.chat/icons';
import type { ReactNode } from 'react';

export type StatusItemProps = {
  icon: IconName;
  children: ReactNode;
  title?: string;
};

/** One icon-and-value cell of a window's status bar. */
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
