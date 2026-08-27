import { Box } from '@rocket.chat/fuselage';
import type { ReactNode } from 'react';

import { CARD_INSET } from './appearance';

export type StatusBarProps = {
  children: ReactNode;
  /** Pushed to the trailing edge — a destructive link, usually. */
  action?: ReactNode;
};

/**
 * The strip under the content card. It lives inside the content column rather
 * than spanning the window, so it starts where the list does instead of cutting
 * across the sidebar, and its padding lines its content up with the card's.
 */
export const StatusBar = ({ children, action }: StatusBarProps) => (
  <Box
    display='flex'
    flexDirection='row'
    alignItems='center'
    flexShrink={0}
    paddingBlock='x8'
    fontScale='micro'
    color='hint'
    style={{
      userSelect: 'none',
      paddingInlineStart: `${CARD_INSET + 12}px`,
      paddingInlineEnd: `${CARD_INSET + 12}px`,
    }}
  >
    {children}
    <Box flexGrow={1} />
    {action}
  </Box>
);
