import { Box } from '@rocket.chat/fuselage';
import { useSelector } from 'react-redux';

import type { RootState } from '../../../store/rootReducer';

export const TopBar = () => {
  const mainWindowTitle = useSelector(
    ({ mainWindowTitle }: RootState) => mainWindowTitle
  );
  return (
    <Box
      className='rcx-sidebar--main'
      height='x28'
      display='flex'
      flexDirection='row'
      justifyContent='center'
      alignItems='center'
      color='default'
      bg='tint'
      width='100%'
    >
      <Box fontScale='p2'>{mainWindowTitle}</Box>
    </Box>
  );
};
