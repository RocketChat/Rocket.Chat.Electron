import { ipcRenderer, shell } from 'electron';

import { select } from '../../store';

export const getInternalVideoChatWindowEnabled = (): boolean =>
  select(({ isInternalVideoChatWindowEnabled }) => ({
    isInternalVideoChatWindowEnabled,
  })).isInternalVideoChatWindowEnabled;

export const openInternalVideoChatWindow = (
  url: string,
  providerName: string | undefined,
  _options: undefined
): void => {
  const validUrl = new URL(url);
  const allowedProtocols = ['http:', 'https:'];
  if (!allowedProtocols.includes(validUrl.protocol)) {
    return;
  }
  if (!process.mas && getInternalVideoChatWindowEnabled()) {
    switch (providerName) {
      case 'jitsi':
        window.open(validUrl.href, 'Video Call', 'scrollbars=true');
        break;
      case 'googlemeet':
        shell.openExternal(validUrl.href);
        break;
      default:
        ipcRenderer.invoke(
          'video-call-window/open-window',
          validUrl.href,
          _options
        );
        break;
    }
  } else {
    shell.openExternal(validUrl.href);
  }
};
