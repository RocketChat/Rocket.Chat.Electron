import { ipcRenderer } from 'electron';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { invoke } from '../../ipc/renderer';
import { CloseGlyph } from '../components/TabBar/CloseGlyph';
import { MaximizeGlyph } from '../components/TabBar/MaximizeGlyph';
import { MinimizeGlyph } from '../components/TabBar/MinimizeGlyph';
import { RestoreGlyph } from '../components/TabBar/RestoreGlyph';
import {
  WindowControlButton,
  WindowControlsGroup,
} from '../components/TabBar/styles';
import { WINDOW_MAXIMIZED_CHANNEL } from './channels';

/**
 * Minimise, maximise and close, drawn into the toolbar on the platforms whose
 * native title bar these windows hide.
 *
 * Glyphs and button styling come from the main window's own controls, so the
 * secondary windows are not a second set of caption buttons that drift from it.
 * What differs is the wiring: the main window's buttons dispatch redux actions
 * bound to that one window, while these ask the main process to act on whichever
 * window sent the request.
 */
export const WindowControls = () => {
  const { t } = useTranslation();
  const [isMaximized, setIsMaximized] = useState(false);

  useEffect(() => {
    let isCurrent = true;

    invoke('secondary-window/is-maximized').then((maximized) => {
      if (isCurrent) setIsMaximized(maximized);
    });

    const handleChange = (_event: unknown, maximized: boolean): void => {
      setIsMaximized(Boolean(maximized));
    };

    ipcRenderer.on(WINDOW_MAXIMIZED_CHANNEL, handleChange);
    return () => {
      isCurrent = false;
      ipcRenderer.off(WINDOW_MAXIMIZED_CHANNEL, handleChange);
    };
  }, []);

  const handleMinimize = useCallback(() => {
    invoke('secondary-window/minimize');
  }, []);

  const handleMaximize = useCallback(() => {
    invoke('secondary-window/toggle-maximize');
  }, []);

  const handleClose = useCallback(() => {
    invoke('secondary-window/close');
  }, []);

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
