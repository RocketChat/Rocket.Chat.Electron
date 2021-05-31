import type { DownloadStatus } from './DownloadStatus';
import type { Server } from './Server';

export type Download = {
  itemId: number;
  state: 'progressing' | 'paused' | 'completed' | 'cancelled' | 'interrupted';
  status: typeof DownloadStatus[keyof typeof DownloadStatus];
  fileName: string;
  receivedBytes: number;
  totalBytes: number;
  startTime: number;
  endTime: number | undefined;
  url: string;
  serverUrl: Server['url'];
  serverTitle: Server['title'];
  savePath: string;
  mimeType: string;
};
