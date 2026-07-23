import { Box } from '@rocket.chat/fuselage';
import type { ReactNode } from 'react';
import { useSelector } from 'react-redux';

import type { RootState } from '../../../store/rootReducer';

type TopBarProps = {
  leadingSlot?: ReactNode;
  trailingSlot?: ReactNode;
  textAlignment?: 'left' | 'center' | 'right';
};

export const TopBar = ({
  leadingSlot,
  trailingSlot,
  textAlignment = 'center',
}: TopBarProps) => {
  const mainWindowTitle = useSelector(
    ({ mainWindowTitle }: RootState) => mainWindowTitle
  );

  return (
    <Box
      className='rcx-sidebar--main'
      height={process.platform === 'darwin' ? 'x28' : 'x32'}
      display='flex'
      flexDirection='row'
      justifyContent='center'
      alignItems='center'
      color='default'
      width='100%'
    >
      {leadingSlot}
      <Box
        fontScale='p2'
        flexGrow={1}
        textAlign={textAlignment}
        overflow='hidden'
        padding='0 8px'
        style={{ whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}
      >
        {mainWindowTitle}
      </Box>
      {trailingSlot}
    </Box>
  );
};
