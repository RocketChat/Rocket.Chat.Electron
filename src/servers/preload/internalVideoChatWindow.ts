import { ipcRenderer } from 'electron';

import { select } from '../../store';
import { openExternal } from '../../utils/browserLauncher';

export const getInternalVideoChatWindowEnabled = (): boolean =>
  select(({ isInternalVideoChatWindowEnabled }) => ({
    isInternalVideoChatWindowEnabled,
  })).isInternalVideoChatWindowEnabled;

export type videoCallWindowOptions = {
  providerName?: string | undefined;
};

export const openInternalVideoChatWindow = (
  url: string,
  options: videoCallWindowOptions | undefined
): void => {
  const validUrl = new URL(url);
  const allowedProtocols = ['http:', 'https:'];
  if (!allowedProtocols.includes(validUrl.protocol)) {
    return;
  }
  if (!process.mas && getInternalVideoChatWindowEnabled()) {
    switch (options?.providerName) {
      case 'jitsi':
        // window.open(validUrl.href, 'Video Call', 'scrollbars=true');
        // We will open Jitsi on browser instead of opening a new window for compatibility from their side
        ipcRenderer.invoke(
          'video-call-window/open-window',
          validUrl.href,
          options
        );
        break;
      case 'googlemeet':
        openExternal(validUrl.href);
        break;
      default:
        ipcRenderer.invoke(
          'video-call-window/open-window',
          validUrl.href,
          options
        );
        break;
    }
  } else {
    openExternal(validUrl.href);
  }
};
