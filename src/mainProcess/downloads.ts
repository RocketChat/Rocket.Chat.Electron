import {
  clipboard,
  DownloadItem,
  shell,
  WebContents,
  webContents,
} from 'electron';

import type { Download } from '../common/types/Download';

const items = new Map<Download['itemId'], DownloadItem>();

export const registerDownloadItem = (
  itemId: Download['itemId'],
  item: DownloadItem
): void => {
  items.set(itemId, item);
};

export const unregisterDownloadItem = (itemId: Download['itemId']): void => {
  items.delete(itemId);
};

export const showDownloadInFolder = (download: Download): void => {
  shell.showItemInFolder(download.savePath);
};

export const copyDownloadLink = (download: Download): void => {
  clipboard.write({ text: download.url });
};

export const pauseDownload = (download: Download): void => {
  const item = items.get(download.itemId);

  if (item?.isPaused()) {
    return;
  }

  item?.pause();
};

export const resumeDownload = (download: Download): void => {
  const item = items.get(download.itemId);

  if (!item?.canResume()) {
    return;
  }

  item?.resume();
};

export const cancelDownload = (download: Download): void => {
  const item = items.get(download.itemId);
  item?.cancel();
};

export const startDownload = (
  url: Download['url'],
  webContentsId: WebContents['id']
): void => {
  webContents.fromId(webContentsId)?.downloadURL(url);
};
