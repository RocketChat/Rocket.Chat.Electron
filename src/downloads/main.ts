import path from 'path';

import { clipboard, DownloadItem, Event, shell, WebContents, webContents } from 'electron';

import { handle } from '../ipc/main';
import { dispatch, select } from '../store';
import {
  DOWNLOAD_CREATED,
  DOWNLOAD_REMOVED,
  DOWNLOAD_UPDATED,
} from './actions';
import { Download, DownloadStatus } from './common';

const items = new Map<Download['itemId'], DownloadItem>();

export const handleWillDownloadEvent = async (_event: Event, item: DownloadItem, serverWebContents: WebContents): Promise<void> => {
  const itemId = Date.now();

  items.set(itemId, item);

  const fileName = item.getFilename();

  const extension = path.extname(fileName)?.slice(1).toLowerCase();

  if (extension) {
    item.setSaveDialogOptions({
      filters: [
        {
          name: `*.${ extension }`,
          extensions: [extension],
        },
        {
          name: '*.*',
          extensions: ['*'],
        },
      ],
    });
  }

  const server = select(({ servers }) => servers.find((server) => server.webContentsId === serverWebContents.id));

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

  item.on('done', () => {
    dispatch({
      type: DOWNLOAD_UPDATED,
      payload: {
        itemId,
        state: item.isPaused() ? 'paused' : item.getState(),
        status: item.getState() === 'cancelled' ? DownloadStatus.CANCELLED : DownloadStatus.ALL,
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

    if (item.isPaused()) {
      return;
    }

    item.pause();
  });

  handle('downloads/resume', async (_webContent, itemId) => {
    if (!items.has(itemId)) {
      return;
    }

    const item = items.get(itemId);

    if (!item.canResume()) {
      return;
    }

    item.resume();
  });

  handle('downloads/cancel', async (_webContent, itemId) => {
    if (!items.has(itemId)) {
      return;
    }

    const item = items.get(itemId);
    item.cancel();
  });

  handle('downloads/retry', async (_webContent, itemId) => {
    const { url, webContentsId } = select(({ downloads, servers }) => {
      const { url, serverUrl } = downloads[itemId];
      const { webContentsId } = servers.find((server) => server.url === serverUrl);
      return { url, webContentsId };
    });

    dispatch({
      type: DOWNLOAD_REMOVED,
      payload: itemId,
    });

    webContents.fromId(webContentsId).downloadURL(url);
  });

  handle('downloads/remove', async (_webContent, itemId) => {
    if (items.has(itemId)) {
      const item = items.get(itemId);
      item.cancel();
    }

    dispatch({
      type: DOWNLOAD_REMOVED,
      payload: itemId,
    });
  });
};
