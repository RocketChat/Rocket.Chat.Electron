import { Download } from './common';

export const DOWNLOAD_CREATED = 'downloads/created';
export const DOWNLOAD_REMOVED = 'dowloads/removed';
export const DOWNLOADS_CLEARED = 'downloads/cleared';
export const DOWNLOAD_UPDATED = 'downloads/updated';

export type DownloadsActionTypeToPayloadMap = {
  [DOWNLOAD_CREATED]: Download;
  [DOWNLOAD_UPDATED]: Pick<Download, 'itemId'> & Partial<Download>;
  [DOWNLOAD_REMOVED]: Download['itemId'];
  [DOWNLOADS_CLEARED]: void;
};
