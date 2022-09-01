import path from 'path';

import {
  clipboard,
  DownloadItem,
  Event,
  shell,
  WebContents,
  webContents,
} from 'electron';
import { t } from 'i18next';

import { handle } from '../ipc/main';
import { createNotification } from '../notifications/preload';
import { dispatch, select } from '../store';
import {
  DOWNLOAD_CREATED,
  DOWNLOAD_REMOVED,
  DOWNLOAD_UPDATED,
} from './actions';
import { Download, DownloadStatus } from './common';

const items = new Map<Download['itemId'], DownloadItem>();

export const handleWillDownloadEvent = async (
  _event: Event,
  item: DownloadItem,
  serverWebContents: WebContents
): Promise<void> => {
  const itemId = Date.now();

  items.set(itemId, item);

  const fileName = item.getFilename();

  const extension = path.extname(fileName)?.slice(1).toLowerCase();

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

  const server = select(({ servers }) =>
    servers.find((server) => server.webContentsId === serverWebContents.id)
  );

  if (!server) {
    // TODO: check if the download always comes from the main frame webContents
    throw new Error('could not match the server');
  }

  dispatch({
    type: DOWNLOAD_CREATED,
    payload: {
      itemId,
      state: item.isPaused() ? 'paused' : item.getState(),
      status: item.isPaused() ? DownloadStatus.PAUSED : DownloadStatus.ALL,
      fileName: item.getFilename(),
      receivedBytes: item.getReceivedBytes(),
      totalBytes: item.getTotalBytes(),
      startTime: item.getStartTime() * 1000,
      endTime: undefined,
      url: item.getURL(),
      serverUrl: server?.url,
      serverTitle: server?.title,
      mimeType: item.getMimeType(),
      savePath: item.getSavePath(),
    },
  });

  item.on('updated', () => {
    dispatch({
      type: DOWNLOAD_UPDATED,
      payload: {
        itemId,
        state: item.isPaused() ? 'paused' : item.getState(),
        status: item.isPaused() ? DownloadStatus.PAUSED : DownloadStatus.ALL,
        fileName: item.getFilename(),
        receivedBytes: item.getReceivedBytes(),
        totalBytes: item.getTotalBytes(),
        startTime: item.getStartTime() * 1000,
        endTime: Date.now(),
        url: item.getURL(),
        mimeType: item.getMimeType(),
        savePath: item.getSavePath(),
      },
    });
  });

  item.on('done', (_event, state) => {
    createNotification({
      title: 'Downloads',
      body: item.getFilename(),
      subtitle:
        state === 'completed'
          ? t('downloads.notifications.downloadFinished')
          : t('downloads.notifications.downloadCancelled'),
    });

    dispatch({
      type: DOWNLOAD_UPDATED,
      payload: {
        itemId,
        state: item.getState(),
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
      },
    });

    items.delete(itemId);
  });
};

export const setupDownloads = (): void => {
  handle('downloads/show-in-folder', async (_webContents, itemId) => {
    const download = select(({ downloads }) => downloads[itemId]);

    if (!download) {
      return;
    }

    shell.showItemInFolder(download.savePath);
  });

  handle('downloads/copy-link', async (_webContent, itemId) => {
    const download = select(({ downloads }) => downloads[itemId]);

    if (!download) {
      return;
    }

    clipboard.write({ text: download.url });
  });

  handle('downloads/pause', async (_webContent, itemId) => {
    if (!items.has(itemId)) {
      return;
    }

    const item = items.get(itemId);

    if (item?.isPaused()) {
      return;
    }

    item?.pause();
  });

  handle('downloads/resume', async (_webContent, itemId) => {
    if (!items.has(itemId)) {
      return;
    }

    const item = items.get(itemId);

    if (!item?.canResume()) {
      return;
    }

    item?.resume();
  });

  handle('downloads/cancel', async (_webContent, itemId) => {
    if (!items.has(itemId)) {
      return;
    }

    const item = items.get(itemId);
    item?.cancel();
  });

  handle('downloads/retry', async (_webContent, itemId) => {
    const { download, webContentsId } = select(({ downloads, servers }) => {
      const download = downloads[itemId];
      const { webContentsId } =
        servers.find((server) => server.url === download.serverUrl) ?? {};
      return { download, webContentsId };
    });

    const downloadStartTimestamp = new URL(download.url).searchParams.get(
      'X-Amz-Date'
    );
    const expiresIn =
      new URL(download.url).searchParams.get('X-Amz-Expires') ?? 120;
    const parsedStartTime = {
      year: downloadStartTimestamp?.substring(0, 4),
      month: downloadStartTimestamp?.substring(4, 6),
      day: downloadStartTimestamp?.substring(6, 8),
      hour: downloadStartTimestamp?.substring(9, 11),
      minute: downloadStartTimestamp?.substring(11, 13),
      second: downloadStartTimestamp?.substring(13, 15),
    };

    const s3Expired =
      new Date().getTime() >
      new Date(
        `${parsedStartTime.year}-${parsedStartTime.month}-${parsedStartTime.day}T${parsedStartTime.hour}:${parsedStartTime.minute}:${parsedStartTime.second}Z`
      ).getTime() +
        +expiresIn * 1000;

    if (s3Expired) {
      createNotification({
        title: t('downloads.notifications.downloadExpired'),
        body: t('downloads.notifications.downloadExpiredMessage'),
        subtitle: download.fileName,
      });

      dispatch({
        type: DOWNLOAD_UPDATED,
        payload: {
          ...download,
          state: 'expired',
          status: DownloadStatus.CANCELLED,
        },
      });

      return;
    }

    dispatch({
      type: DOWNLOAD_REMOVED,
      payload: itemId,
    });

    if (webContentsId) {
      webContents.fromId(webContentsId).downloadURL(download.url);
    }
  });

  handle('downloads/remove', async (_webContent, itemId) => {
    if (items.has(itemId)) {
      const item = items.get(itemId);
      item?.cancel();
    }

    dispatch({
      type: DOWNLOAD_REMOVED,
      payload: itemId,
    });
  });
};
