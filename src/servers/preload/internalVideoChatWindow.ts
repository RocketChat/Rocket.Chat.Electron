import { ipcRenderer } from 'electron';

import { safeSelect } from '../../store';
import { openExternal } from '../../utils/browserLauncher';

export const getInternalVideoChatWindowEnabled = (): boolean =>
  safeSelect(
    ({ isInternalVideoChatWindowEnabled }) => isInternalVideoChatWindowEnabled
  ) ?? false;

export type videoCallWindowOptions = {
  providerName?: string | undefined;
  credentials?: {
    userId: string;
    authToken: string;
  };
};

const getCredentialsForPexip = (
  options: videoCallWindowOptions | undefined
): videoCallWindowOptions | undefined => {
  if (options?.providerName !== 'pexip') {
    return options;
  }

  const authToken = localStorage.getItem('Meteor.loginToken');
  const userId = localStorage.getItem('Meteor.userId');
  if (authToken && userId) {
    return {
      ...options,
      credentials: { userId, authToken },
    };
  }

  return options;
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
    const enrichedOptions = getCredentialsForPexip(options);
    switch (options?.providerName) {
      case 'jitsi':
        // window.open(validUrl.href, 'Video Call', 'scrollbars=true');
        // We will open Jitsi on browser instead of opening a new window for compatibility from their side
        ipcRenderer.invoke(
          'video-call-window/open-window',
          validUrl.href,
          enrichedOptions
        );
        break;
      case 'googlemeet':
        openExternal(validUrl.href);
        break;
      default:
        ipcRenderer.invoke(
          'video-call-window/open-window',
          validUrl.href,
          enrichedOptions
        );
        break;
    }
  } else {
    openExternal(validUrl.href);
  }
};
