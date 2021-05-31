import type { PersistableValues_0_0_0 } from './PersistableValues_0_0_0';

export type PersistableValues_3_1_0 = Omit<
  PersistableValues_0_0_0,
  'currentServerUrl' | 'currentView'
> & {
  currentView:
    | Exclude<PersistableValues_0_0_0['currentView'], null>
    | { url: string }
    | 'downloads';
  downloads: Record<
    number,
    {
      itemId: number;
      state:
        | 'progressing'
        | 'paused'
        | 'completed'
        | 'cancelled'
        | 'interrupted';
      status: 'All' | 'Paused' | 'Cancelled';
      fileName: string;
      receivedBytes: number;
      totalBytes: number;
      startTime: number;
      endTime: number | undefined;
      url: string;
      serverUrl: string;
      serverTitle: string | undefined;
      savePath: string;
      mimeType: string;
    }
  >;
};
