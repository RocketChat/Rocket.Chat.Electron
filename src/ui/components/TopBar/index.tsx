import { Box } from '@rocket.chat/fuselage';
import { useSelector } from 'react-redux';

import type { RootState } from '../../../store/rootReducer';

export const TopBar = () => {
  const mainWindowTitle = useSelector(
    ({ mainWindowTitle }: RootState) => mainWindowTitle
  );

  const isTransparentWindowEnabled = useSelector(
    ({ isTransparentWindowEnabled }: RootState) => isTransparentWindowEnabled
  );

  const sidebarBg =
    process.platform === 'darwin' && isTransparentWindowEnabled
      ? undefined
      : 'tint';

  return (
    <Box
      className='rcx-sidebar--main'
      height='x28'
      display='flex'
      flexDirection='row'
      justifyContent='center'
      alignItems='center'
      color='default'
      bg={sidebarBg}
      width='100%'
    >
      <Box fontScale='p2'>{mainWindowTitle}</Box>
    </Box>
  );
};
