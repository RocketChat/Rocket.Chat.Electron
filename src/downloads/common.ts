import { Server } from '../servers/common';

export const DownloadStatus = {
  ALL: 'All',
  PAUSED: 'Paused',
  CANCELLED: 'Cancelled',
} as const;

export type Download = {
  itemId: number;
  state:
    | 'progressing'
    | 'paused'
    | 'completed'
    | 'cancelled'
    | 'interrupted'
    | 'expired';
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
