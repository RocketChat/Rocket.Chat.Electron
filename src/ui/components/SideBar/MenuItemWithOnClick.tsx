/* eslint-disable @typescript-eslint/naming-convention */
/* eslint-disable react/display-name */
// MenuItemWithOnClick.tsx
import { MenuItem } from '@rocket.chat/fuselage'; // Adjust the import path as necessary
import type { MouseEvent } from 'react';

interface IWithOnClickProps {
  onClick: (event: MouseEvent<HTMLDivElement>) => void;
}

const withOnClick = <P extends object>(
  WrappedComponent: React.ComponentType<P>
): React.FC<P & IWithOnClickProps> => {
  return ({ onClick, ...props }) => (
    <div onClick={onClick}>
      <WrappedComponent {...(props as P)} />
    </div>
  );
};

const MenuItemWithOnClick = withOnClick(MenuItem);

export default MenuItemWithOnClick;
