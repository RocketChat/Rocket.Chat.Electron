import { Box } from '@rocket.chat/fuselage';
import { useSelector } from 'react-redux';

import type { RootState } from '../../../store/rootReducer';
import { WindowControls } from './WindowControls';
import { TitleBarDragRegion, TitleBarStrip } from './styles';

export const WindowsTitleBar = () => {
  const mainWindowTitle = useSelector(
    ({ mainWindowTitle }: RootState) => mainWindowTitle
  );

  return (
    <TitleBarStrip>
      <TitleBarDragRegion>
        <Box fontScale='p2'>{mainWindowTitle}</Box>
      </TitleBarDragRegion>
      <WindowControls />
    </TitleBarStrip>
  );
};

export default WindowsTitleBar;
