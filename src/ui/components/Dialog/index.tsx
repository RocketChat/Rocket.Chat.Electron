import { Scrollable, Tile } from '@rocket.chat/fuselage';
import React, { FC } from 'react';

import { useDialog } from './hooks';
import { Wrapper } from './styles';

type DialogProps = {
  isVisible?: boolean;
  onClose?: () => void;
};

export const Dialog: FC<DialogProps> = ({
  children,
  isVisible = false,
  onClose,
}) => {
  const dialogRef = useDialog(isVisible, onClose);

  return (
    <Wrapper ref={dialogRef}>
      <Scrollable>
        <Tile elevation='2' padding='x32' display='flex' flexDirection='column'>
          {children}
        </Tile>
      </Scrollable>
    </Wrapper>
  );
};
