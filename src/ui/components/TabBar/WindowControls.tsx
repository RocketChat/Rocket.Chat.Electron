import { useTranslation } from 'react-i18next';
import { useSelector } from 'react-redux';

import { dispatch } from '../../../store';
import type { RootState } from '../../../store/rootReducer';
import {
  WINDOW_CONTROLS_CLOSE_CLICKED,
  WINDOW_CONTROLS_MAXIMIZE_CLICKED,
  WINDOW_CONTROLS_MINIMIZE_CLICKED,
} from '../../actions';
import { CloseGlyph } from './CloseGlyph';
import { MaximizeGlyph } from './MaximizeGlyph';
import { MinimizeGlyph } from './MinimizeGlyph';
import { RestoreGlyph } from './RestoreGlyph';
import { WindowControlButton, WindowControlsGroup } from './styles';

export const WindowControls = () => {
  const { t } = useTranslation();

  const isMaximized = useSelector(
    ({ rootWindowState }: RootState) =>
      rootWindowState.maximized || rootWindowState.fullscreen
  );

  const handleMinimize = (): void => {
    dispatch({ type: WINDOW_CONTROLS_MINIMIZE_CLICKED });
  };

  const handleMaximize = (): void => {
    dispatch({ type: WINDOW_CONTROLS_MAXIMIZE_CLICKED });
  };

  const handleClose = (): void => {
    dispatch({ type: WINDOW_CONTROLS_CLOSE_CLICKED });
  };

  const maximizeLabel = isMaximized
    ? t('tabBar.windowControls.restore')
    : t('tabBar.windowControls.maximize');

  return (
    <WindowControlsGroup>
      <WindowControlButton
        type='button'
        aria-label={t('tabBar.windowControls.minimize')}
        title={t('tabBar.windowControls.minimize')}
        onClick={handleMinimize}
      >
        <MinimizeGlyph />
      </WindowControlButton>
      <WindowControlButton
        type='button'
        aria-label={maximizeLabel}
        title={maximizeLabel}
        onClick={handleMaximize}
      >
        {isMaximized ? <RestoreGlyph /> : <MaximizeGlyph />}
      </WindowControlButton>
      <WindowControlButton
        type='button'
        isCloseButton
        aria-label={t('tabBar.windowControls.close')}
        title={t('tabBar.windowControls.close')}
        onClick={handleClose}
      >
        <CloseGlyph />
      </WindowControlButton>
    </WindowControlsGroup>
  );
};

export default WindowControls;
