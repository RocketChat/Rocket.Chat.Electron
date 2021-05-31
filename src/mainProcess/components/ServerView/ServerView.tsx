import { webContents } from 'electron';
import { useEffect, useMemo } from 'react';

import { attachServerView } from '../../serverView';
import { useBypassKeyShortcuts } from './useBypassKeyShortcuts';
import { useContextMenu } from './useContextMenu';
import { useDownloads } from './useDownloads';
import { useNavigationEvents } from './useNavigationEvents';
import { usePermissionRequestHandling } from './usePermissionRequestHandling';

type ServerViewProps = {
  url: string;
  webContentsId?: number;
};

const ServerView = ({ url, webContentsId }: ServerViewProps): null => {
  useEffect(() => {
    if (webContentsId === undefined) {
      return;
    }

    return attachServerView(url, webContentsId);
  }, [url, webContentsId]);

  const guestWebContents = useMemo(
    () =>
      typeof webContentsId === 'number'
        ? webContents.fromId(webContentsId)
        : undefined,
    [webContentsId]
  );

  useBypassKeyShortcuts(guestWebContents);
  useContextMenu(guestWebContents);
  useDownloads(guestWebContents);
  usePermissionRequestHandling(guestWebContents);
  useNavigationEvents(guestWebContents);

  return null;
};

export default ServerView;
