import { BrowserWindow, ContextMenuParams, WebContents } from 'electron';
import { useEffect } from 'react';

import { createPopupMenuForServerView } from '../../popupMenu';

export const useContextMenu = (
  guestWebContents: WebContents | undefined
): void => {
  useEffect(() => {
    if (!guestWebContents) {
      return;
    }

    const rootWindow = BrowserWindow.fromWebContents(
      guestWebContents.hostWebContents
    );

    if (!rootWindow) {
      return;
    }

    const handleContextMenu = async (
      event: Event,
      params: ContextMenuParams
    ): Promise<void> => {
      event.preventDefault();
      const menu = createPopupMenuForServerView(guestWebContents, params);
      menu.popup({ window: rootWindow });
    };

    guestWebContents.on('context-menu', handleContextMenu);

    return () => {
      guestWebContents.off('context-menu', handleContextMenu);
    };
  }, [guestWebContents]);
};
