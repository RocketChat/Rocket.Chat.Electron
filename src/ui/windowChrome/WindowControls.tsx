import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { CloseGlyph } from '../components/TabBar/CloseGlyph';
import { MaximizeGlyph } from '../components/TabBar/MaximizeGlyph';
import { MinimizeGlyph } from '../components/TabBar/MinimizeGlyph';
import { RestoreGlyph } from '../components/TabBar/RestoreGlyph';
import {
  WindowControlButton,
  WindowControlsGroup,
} from '../components/TabBar/styles';
import { WINDOW_MAXIMIZED_CHANNEL } from './channels';
import type { BridgeInvoke, BridgeSubscribe } from './logViewerBridge';
import { getLogViewerBridge } from './logViewerBridge';

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
type WindowControlsProps = {
  /** Fixed-size windows cannot maximise, so they show no button for it. */
  isMaximizable?: boolean;
  /** Legacy invoke for non-sandboxed windows. Defaults to the bridge. */
  invokeAction?: BridgeInvoke;
  /** Legacy maximized subscription for non-sandboxed windows. */
  subscribeMaximized?: BridgeSubscribe;
};

export const WindowControls = ({
  isMaximizable = true,
  invokeAction,
  subscribeMaximized,
}: WindowControlsProps) => {
  const { t } = useTranslation();
  const [isMaximized, setIsMaximized] = useState(false);

  useEffect(() => {
    let isCurrent = true;
    const bridge = getLogViewerBridge();
    const invokeFn: BridgeInvoke | undefined =
      invokeAction ?? bridge?.invoke.bind(bridge);
    const subscribeFn: BridgeSubscribe | undefined =
      subscribeMaximized ??
      (bridge
        ? (channel, listener) =>
            bridge.on(channel, (maximized: unknown) => {
              listener(Boolean(maximized));
            })
        : undefined);

    invokeFn?.('secondary-window/is-maximized').then((maximized) => {
      if (isCurrent) setIsMaximized(Boolean(maximized));
    });

    if (!subscribeFn) {
      return () => {
        isCurrent = false;
      };
    }

    const unsubscribe = subscribeFn(
      WINDOW_MAXIMIZED_CHANNEL,
      setIsMaximized
    );
    return () => {
      isCurrent = false;
      unsubscribe();
    };
  }, [invokeAction, subscribeMaximized]);

  const handleMinimize = useCallback(() => {
    const bridge = getLogViewerBridge();
    (invokeAction ?? bridge?.invoke.bind(bridge))?.(
      'secondary-window/minimize'
    );
  }, [invokeAction]);

  const handleMaximize = useCallback(() => {
    const bridge = getLogViewerBridge();
    (invokeAction ?? bridge?.invoke.bind(bridge))?.(
      'secondary-window/toggle-maximize'
    );
  }, [invokeAction]);

  const handleClose = useCallback(() => {
    const bridge = getLogViewerBridge();
    (invokeAction ?? bridge?.invoke.bind(bridge))?.('secondary-window/close');
  }, [invokeAction]);

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
      {isMaximizable && (
        <WindowControlButton
          type='button'
          aria-label={maximizeLabel}
          title={maximizeLabel}
          onClick={handleMaximize}
        >
          {isMaximized ? <RestoreGlyph /> : <MaximizeGlyph />}
        </WindowControlButton>
      )}
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
