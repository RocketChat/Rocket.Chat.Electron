import { extname } from 'path';

import type { DownloadItem, WebContents } from 'electron';
import { useEffect } from 'react';

import * as downloadActions from '../../../common/actions/downloadActions';
import { useAppDispatch } from '../../../common/hooks/useAppDispatch';
import { useAppSelector } from '../../../common/hooks/useAppSelector';
import { DownloadStatus } from '../../../common/types/DownloadStatus';
import { registerDownloadItem, unregisterDownloadItem } from '../../downloads';

export const useDownloads = (
  guestWebContents: WebContents | undefined
): void => {
  const serverUrl = useAppSelector(
    (state) =>
      state.servers.find(
        (server) => server.webContentsId === guestWebContents?.id
      )?.url
  );
  const serverTitle = useAppSelector(
    (state) =>
      state.servers.find(
        (server) => server.webContentsId === guestWebContents?.id
      )?.title
  );
  const dispatch = useAppDispatch();

  useEffect(() => {
    if (!guestWebContents || !serverUrl) {
      return;
    }

    const handleWillDownloadEvent = (_event: Event, item: DownloadItem) => {
      const itemId = Date.now();

      registerDownloadItem(itemId, item);

      const fileName = item.getFilename();

      const extension = extname(fileName)?.slice(1).toLowerCase();

      if (extension) {
        item.setSaveDialogOptions({
          filters: [
            {
              name: `*.${extension}`,
              extensions: [extension],
            },
            {
              name: '*.*',
              extensions: ['*'],
            },
          ],
        });
      }

      dispatch(
        downloadActions.created({
          itemId,
          state: item.isPaused() ? 'paused' : item.getState(),
          status: item.isPaused() ? DownloadStatus.PAUSED : DownloadStatus.ALL,
          fileName: item.getFilename(),
          receivedBytes: item.getReceivedBytes(),
          totalBytes: item.getTotalBytes(),
          startTime: item.getStartTime() * 1000,
          endTime: undefined,
          url: item.getURL(),
          serverUrl,
          serverTitle,
          mimeType: item.getMimeType(),
          savePath: item.getSavePath(),
        })
      );

      item.on('updated', () => {
        dispatch(
          downloadActions.updated(itemId, {
            state: item.isPaused() ? 'paused' : item.getState(),
            status: item.isPaused()
              ? DownloadStatus.PAUSED
              : DownloadStatus.ALL,
            fileName: item.getFilename(),
            receivedBytes: item.getReceivedBytes(),
            totalBytes: item.getTotalBytes(),
            startTime: item.getStartTime() * 1000,
            endTime: Date.now(),
            url: item.getURL(),
            mimeType: item.getMimeType(),
            savePath: item.getSavePath(),
          })
        );
      });

      item.on('done', () => {
        dispatch(
          downloadActions.updated(itemId, {
            state: item.isPaused() ? 'paused' : item.getState(),
            status:
              item.getState() === 'cancelled'
                ? DownloadStatus.CANCELLED
                : DownloadStatus.ALL,
            fileName: item.getFilename(),
            receivedBytes: item.getReceivedBytes(),
            totalBytes: item.getTotalBytes(),
            startTime: item.getStartTime() * 1000,
            endTime: Date.now(),
            url: item.getURL(),
            mimeType: item.getMimeType(),
            savePath: item.getSavePath(),
          })
        );

        unregisterDownloadItem(itemId);
      });
    };

    guestWebContents.session.on('will-download', handleWillDownloadEvent);

    return () => {
      guestWebContents.session.off('will-download', handleWillDownloadEvent);
    };
  }, [dispatch, guestWebContents, serverTitle, serverUrl]);
};
