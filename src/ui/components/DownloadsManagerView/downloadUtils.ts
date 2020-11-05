// Utility function for bytes conversion. TODO: seperate into another file.
export const formatBytes = (bytes: number, decimals = 2, size = false): string => {
  if (bytes === 0) {
    return '0 Bytes';
  }

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];

  const i = Math.floor(Math.log(bytes) / Math.log(k));

  if (size) {
    return `${ parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) } ${ sizes[i] }`;
  }

  return String(parseFloat((bytes / Math.pow(k, i)).toFixed(dm)));
};

//  Filetype to Mimetype mapping
export const mapping = {
  application: 'Files',
  image: 'Images',
  video: 'Videos',
  audio: 'Audios',
  text: 'Texts',
} as const;

export const DOWNLOAD_EVENT = {
  PAUSE_ID: 'pause-',
  CANCEL_ID: 'cancel-',
  COMPLETE: 'download-complete',
  COMPLETE_ID: 'download-complete-',
  DOWNLOADING_ID: 'downloading-',
  LOAD: 'load-downloads',
  INITIALIZE: 'initialize-downloads',
  CREATE: 'create-download-item',
} as const;

export const STATUS = {
  CANCELLED: 'Cancelled',
  PAUSED: 'Paused',
  ALL: 'All',
} as const;

export type Download = {
  itemId: string;
  status: typeof STATUS[keyof typeof STATUS];
  percentage: number;
  serverTitle?: unknown;
  Mbps?: unknown;
  Kbps?: unknown;
  fileName?: string;
  thumbnail?: unknown;
  path?: string;
  mime?: string;
  url?: string;
  totalBytes?: number;
  timeLeft?: unknown;
  serverId?: unknown;
};
