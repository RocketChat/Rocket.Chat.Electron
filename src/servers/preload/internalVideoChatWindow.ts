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
  if (!process.mas && getInternalVideoChatWindowEnabled()) {
    switch (_providerName) {
      case 'jitsi':
        window.open(url, 'Jitsi Meet', 'nodeIntegration=no');
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
