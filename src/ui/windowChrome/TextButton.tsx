import { Box } from '@rocket.chat/fuselage';
import type { ReactNode } from 'react';

import { TEXT_BUTTON_CLASS } from './styles';

export type TextButtonProps = {
  children: ReactNode;
  danger?: boolean;
  title?: string;
  onClick: () => void;
};

/**
 * A link-weight control for secondary actions that sit inside dense chrome —
 * section headers and the status bar — where a real button's fill and padding
 * would outweigh what it does.
 */
export const TextButton = ({
  children,
  danger,
  title,
  onClick,
}: TextButtonProps) => (
  <Box
    is='button'
    type='button'
    display='inline-flex'
    alignItems='center'
    justifyContent='center'
    flexShrink={0}
    minSize='x24'
    fontScale='micro'
    color={danger ? 'danger' : 'info'}
    className={TEXT_BUTTON_CLASS}
    title={title}
    style={{
      background: 'none',
      border: 'none',
      padding: 0,
      cursor: 'pointer',
    }}
    onClick={onClick}
  >
    {children}
  </Box>
);
