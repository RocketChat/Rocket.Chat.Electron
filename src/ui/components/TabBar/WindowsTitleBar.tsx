import { useSelector } from 'react-redux';

import type { RootState } from '../../../store/rootReducer';
import { MeatballMenuButton } from './MeatballMenuButton';
import { WindowControls } from './WindowControls';
import { TitleBarDragRegion, TitleBarStrip, TitleBarText } from './styles';

export const WindowsTitleBar = () => {
  const mainWindowTitle = useSelector(
    ({ mainWindowTitle }: RootState) => mainWindowTitle
  );

  return (
    <TitleBarStrip>
      <MeatballMenuButton />
      <TitleBarDragRegion>
        <TitleBarText>{mainWindowTitle}</TitleBarText>
      </TitleBarDragRegion>
      <WindowControls />
    </TitleBarStrip>
  );
};

export default WindowsTitleBar;
