import { Scrollable, Tile } from '@rocket.chat/fuselage';
import type { ReactNode } from 'react';

import { useDialog } from './hooks';
import { Wrapper } from './styles';

type DialogProps = {
  'children'?: ReactNode;
  'isVisible'?: boolean;
  'onClose'?: () => void;
  'data-testid'?: string;
};

export const Dialog = ({
  children,
  isVisible = false,
  onClose,
  'data-testid': dataTestId,
}: DialogProps) => {
  const dialogRef = useDialog(isVisible, onClose);

  return (
    <Wrapper ref={dialogRef} data-testid={dataTestId}>
      <Scrollable>
        <Tile elevation='2' padding='x32' display='flex' flexDirection='column'>
          {children}
        </Tile>
      </Scrollable>
    </Wrapper>
  );
};
