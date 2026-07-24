import { Box } from '@rocket.chat/fuselage';
import type { ReactNode } from 'react';
import { useSelector } from 'react-redux';

import type { RootState } from '../../../store/rootReducer';
import { Strip } from '../TabBar/styles';
import { useShellTheme } from '../hooks/useShellTheme';

type TopBarProps = {
  leadingSlot?: ReactNode;
  trailingSlot?: ReactNode;
  centerSlot?: ReactNode;
  textAlignment?: 'left' | 'center' | 'right';
};

export const TopBar = ({
  leadingSlot,
  trailingSlot,
  centerSlot,
  textAlignment = 'center',
}: TopBarProps) => {
  const mainWindowTitle = useSelector(
    ({ mainWindowTitle }: RootState) => mainWindowTitle
  );

  const paletteTheme = useShellTheme();

  return (
    <Strip
      className='rcx-sidebar--main'
      paletteTheme={paletteTheme}
      height={process.platform === 'darwin' ? '28px' : '32px'}
    >
      {leadingSlot}
      {centerSlot ? (
        <Box
          flexGrow={1}
          minWidth={0}
          display='flex'
          alignItems='center'
          justifyContent='center'
          padding='0 8px'
        >
          {centerSlot}
        </Box>
      ) : (
        <Box
          fontScale='p2'
          flexGrow={1}
          textAlign={textAlignment}
          overflow='hidden'
          padding='0 8px'
          color='default'
          style={{ whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}
        >
          {mainWindowTitle}
        </Box>
      )}
      {trailingSlot}
    </Strip>
  );
};
