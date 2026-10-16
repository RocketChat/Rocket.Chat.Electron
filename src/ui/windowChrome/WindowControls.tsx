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

type WindowWithBridge = {
  RocketChatDesktop?: {
    logViewer?: {
      invoke: (channel: string, ...args: unknown[]) => Promise<unknown>;
      on: (
        eventChannel: string,
        listener: (...args: unknown[]) => void
      ) => () => void;
    };
  };
  require?: (module: string) => {
    ipcRenderer?: {
      invoke: (channel: string, ...args: unknown[]) => Promise<unknown>;
      on: (
        channel: string,
        listener: (event: unknown, ...args: unknown[]) => void
      ) => void;
      off: (
        channel: string,
        listener: (event: unknown, ...args: unknown[]) => void
      ) => void;
    };
  };
};

const getIpcBridge = () => {
  if (typeof window === 'undefined') {
    return undefined;
  }
  const win = window as unknown as WindowWithBridge;

  if (win.RocketChatDesktop?.logViewer) {
    return {
      invoke: (channel: string, ...args: unknown[]) =>
        win.RocketChatDesktop!.logViewer!.invoke(channel, ...args),
      subscribe: (channel: string, listener: (val: boolean) => void) =>
        win.RocketChatDesktop!.logViewer!.on(channel, (val) =>
          listener(Boolean(val))
        ),
    };
  }

  const ipcRenderer = win.require?.('electron')?.ipcRenderer;
  if (ipcRenderer) {
    return {
      invoke: (channel: string, ...args: unknown[]) =>
        ipcRenderer.invoke(channel, ...args),
      subscribe: (channel: string, listener: (val: boolean) => void) => {
        const handler = (_: unknown, ...args: unknown[]) =>
          listener(Boolean(args[0]));
        ipcRenderer.on(channel, handler);
        return () => ipcRenderer.off(channel, handler);
      },
    };
  }

  return undefined;
};

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
};

export const WindowControls = ({
  isMaximizable = true,
}: WindowControlsProps) => {
  const { t } = useTranslation();
  const [isMaximized, setIsMaximized] = useState(false);

  useEffect(() => {
    let isCurrent = true;
    const bridge = getIpcBridge();

    bridge
      ?.invoke('secondary-window/is-maximized')
      .then((maximized) => {
        if (isCurrent) {
          setIsMaximized(Boolean(maximized));
        }
      })
      .catch(() => {});

    if (!bridge) {
      return () => {
        isCurrent = false;
      };
    }

    const unsubscribe = bridge.subscribe(
      WINDOW_MAXIMIZED_CHANNEL,
      setIsMaximized
    );
    return () => {
      isCurrent = false;
      unsubscribe();
    };
  }, []);

  const handleMinimize = useCallback(() => {
    getIpcBridge()?.invoke('secondary-window/minimize');
  }, []);

  const handleMaximize = useCallback(() => {
    getIpcBridge()?.invoke('secondary-window/toggle-maximize');
  }, []);

  const handleClose = useCallback(() => {
    getIpcBridge()?.invoke('secondary-window/close');
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
