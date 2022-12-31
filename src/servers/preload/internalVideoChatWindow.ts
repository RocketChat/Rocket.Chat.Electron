import { shell } from 'electron';

import { select } from '../../store';

export const getInternalVideoChatWindowEnabled = (): boolean =>
  select(({ isInternalVideoChatWindowEnabled }) => ({
    isInternalVideoChatWindowEnabled,
  })).isInternalVideoChatWindowEnabled;

export const openInternalVideoChatWindow = (
  url: string,
  _options: undefined
): void => {
  if (!process.mas && getInternalVideoChatWindowEnabled()) {
    window.open(url, 'Video Call', `scrollbars=true`);
  } else {
    const validUrl = new URL(url);
    const allowedProtocols = ['http:', 'https:'];
    if (allowedProtocols.includes(validUrl.protocol)) {
      shell.openExternal(validUrl.href);
    }
  }
};
