import { ipcRenderer, shell } from 'electron';

import { select } from '../../store';

export const getInternalVideoChatWindowEnabled = (): boolean =>
  select(({ isInternalVideoChatWindowEnabled }) => ({
    isInternalVideoChatWindowEnabled,
  })).isInternalVideoChatWindowEnabled;

export const openInternalVideoChatWindow = (
  url: string,
  _providerName: string | undefined,
  _options: undefined
): void => {
  console.log('openInternalVideoChatWindow', url, _providerName, _options);
  if (!process.mas && getInternalVideoChatWindowEnabled()) {
    switch (_providerName) {
      case 'jitsi':
        window.open(url, 'Video Call', 'scrollbars=true');
        return;
      case 'googlemeet':
        shell.openExternal(url);
        return;
      default:
        ipcRenderer.invoke('video-call-window/open-window', url, _options);
        break;
    }
  } else {
    const validUrl = new URL(url);
    const allowedProtocols = ['http:', 'https:'];
    if (allowedProtocols.includes(validUrl.protocol)) {
      shell.openExternal(validUrl.href);
    }
  }
};
