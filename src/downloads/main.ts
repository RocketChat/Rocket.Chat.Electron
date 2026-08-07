import type { DownloadItem, Event, WebContents } from 'electron';
import { clipboard, shell, webContents } from 'electron';
import { t } from 'i18next';

import { handle } from '../ipc/main';
import { createNotification } from '../notifications/preload';
import { dispatch, listen, select } from '../store';
import {
  DOWNLOAD_CREATED,
  DOWNLOAD_REMOVED,
  DOWNLOAD_UPDATED,
  DOWNLOADS_CLEARED,
  DOWNLOADS_SIMULATION_REQUESTED,
} from './actions';
import type { Download } from './common';
import { DownloadStatus } from './common';

const items = new Map<Download['itemId'], DownloadItem>();

/** Developer-mode flow that fakes two staggered downloads to demo the titlebar indicator. */
let simulatedItemIds: Download['itemId'][] = [];
let simulatedDownloadTimers: ReturnType<typeof setInterval>[] = [];

const stopSimulatedDownloads = (): void => {
  simulatedDownloadTimers.forEach((timer) => clearInterval(timer));
  simulatedDownloadTimers = [];
};

const clearPreviousSimulation = (): void => {
  stopSimulatedDownloads();
  simulatedItemIds.forEach((itemId) => {
    dispatch({ type: DOWNLOAD_REMOVED, payload: itemId });
  });
  simulatedItemIds = [];
};

const startSimulatedDownload = (
  download: Download,
  bytesPerTick: number
): void => {
  let receivedBytes = 0;

  const timer = setInterval(() => {
    receivedBytes = Math.min(receivedBytes + bytesPerTick, download.totalBytes);

    if (receivedBytes >= download.totalBytes) {
      clearInterval(timer);
      simulatedDownloadTimers = simulatedDownloadTimers.filter(
        (t) => t !== timer
      );

      dispatch({
        type: DOWNLOAD_UPDATED,
        payload: {
          itemId: download.itemId,
          state: 'completed',
          status: DownloadStatus.ALL,
          receivedBytes: download.totalBytes,
          endTime: Date.now(),
        },
      });
      return;
    }

    dispatch({
      type: DOWNLOAD_UPDATED,
      payload: {
        itemId: download.itemId,
        state: 'progressing',
        status: DownloadStatus.ALL,
        receivedBytes,
      },
    });
  }, 250);

  simulatedDownloadTimers.push(timer);
};

const startDownloadsSimulation = (): void => {
  clearPreviousSimulation();

  const server = select(({ servers }) => servers[0]);
  const serverUrl = server?.url || 'https://simulated.rocket.chat';
  const serverTitle = server?.title || 'Simulated Server';

  const now = Date.now();

  const videoDownload: Download = {
    itemId: now,
    state: 'progressing',
    status: DownloadStatus.ALL,
    fileName: 'demo-video.mp4',
    receivedBytes: 0,
    totalBytes: 256 * 1024 * 1024,
    startTime: now,
    endTime: undefined,
    url: `${serverUrl}/file-upload/demo-video.mp4`,
    serverUrl,
    serverTitle,
    savePath: '/tmp/demo-video.mp4',
    mimeType: 'video/mp4',
  };

  const archiveDownload: Download = {
    itemId: now + 1,
    state: 'progressing',
    status: DownloadStatus.ALL,
    fileName: 'demo-archive.zip',
    receivedBytes: 0,
    totalBytes: 64 * 1024 * 1024,
    startTime: now,
    endTime: undefined,
    url: `${serverUrl}/file-upload/demo-archive.zip`,
    serverUrl,
    serverTitle,
    savePath: '/tmp/demo-archive.zip',
    mimeType: 'application/zip',
  };

  simulatedItemIds = [videoDownload.itemId, archiveDownload.itemId];

  dispatch({ type: DOWNLOAD_CREATED, payload: videoDownload });
  dispatch({ type: DOWNLOAD_CREATED, payload: archiveDownload });

  // ~8s to completion at 250ms ticks (32 ticks)
  startSimulatedDownload(videoDownload, videoDownload.totalBytes / 32);
  // ~14s to completion at 250ms ticks (56 ticks)
  startSimulatedDownload(archiveDownload, archiveDownload.totalBytes / 56);
};

export const handleWillDownloadEvent = async (
  _event: Event,
  item: DownloadItem,
  serverWebContents: WebContents
): Promise<void> => {
  const itemId = Date.now();
  items.set(itemId, item);

  const server = select(({ servers }) =>
    servers.find((server) => server.webContentsId === serverWebContents.id)
  );

  const serverUrl = server?.url || 'unknown';
  const serverTitle = server?.title || 'Unknown Server';

  const downloadPayload = {
    itemId,
    state: item.isPaused()
      ? ('paused' as const)
      : (item.getState() as Download['state']),
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
  };

  dispatch({
    type: DOWNLOAD_CREATED,
    payload: downloadPayload,
  });

  item.on('updated', () => {
    dispatch({
      type: DOWNLOAD_UPDATED,
      payload: {
        itemId,
        state: item.isPaused()
          ? ('paused' as const)
          : (item.getState() as Download['state']),
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

  item.on('done', (_event, _state) => {
    dispatch({
      type: DOWNLOAD_UPDATED,
      payload: {
        itemId,
        state: item.getState() as Download['state'],
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

/**
 * Persisted downloads left in 'progressing' or 'paused' state across an app
 * restart have no live DownloadItem backing them (the `items` map starts
 * empty every launch) — they can never receive another 'updated'/'done'
 * event, which otherwise freezes the titlebar indicator's ring/percentage
 * forever. Mirrors how Chrome marks orphaned downloads interrupted on
 * restart.
 */
const interruptOrphanedDownloads = (): void => {
  const staleDownloads = select(({ downloads }) =>
    Object.values(downloads ?? {}).filter(
      (download) =>
        (download.state === 'progressing' || download.state === 'paused') &&
        !items.has(download.itemId)
    )
  );

  (Array.isArray(staleDownloads) ? staleDownloads : []).forEach((download) => {
    dispatch({
      type: DOWNLOAD_UPDATED,
      payload: {
        itemId: download.itemId,
        state: 'interrupted',
        endTime: Date.now(),
      },
    });
  });
};

export const setupDownloads = (): void => {
  interruptOrphanedDownloads();

  listen(DOWNLOADS_SIMULATION_REQUESTED, async () => {
    startDownloadsSimulation();
  });

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

    clipboard.writeText(download.url);
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
        category: 'DOWNLOADS',
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

    if (webContentsId && webContents !== undefined) {
      if (webContents.fromId !== undefined) {
        const webContentsInstance = webContents.fromId(webContentsId);
        if (webContentsInstance !== undefined) {
          webContentsInstance.downloadURL(download.url);
        }
      }
    }
  });

  handle('downloads/clear-all' as any, async () => {
    dispatch({
      type: DOWNLOADS_CLEARED,
    });
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
