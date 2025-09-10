import { APP_SETTINGS_LOADED } from '../../app/actions';
import type { ActionOf } from '../../store/actions';
import {
  DOWNLOADS_CLEARED,
  DOWNLOAD_CREATED,
  DOWNLOAD_REMOVED,
  DOWNLOAD_UPDATED,
} from '../actions';
import type { Download } from '../common';
import { DownloadStatus } from '../common';

type DownloadsAction =
  | ActionOf<typeof APP_SETTINGS_LOADED>
  | ActionOf<typeof DOWNLOAD_CREATED>
  | ActionOf<typeof DOWNLOAD_UPDATED>
  | ActionOf<typeof DOWNLOADS_CLEARED>
  | ActionOf<typeof DOWNLOAD_REMOVED>;

export const downloads = (
  state: Record<Download['itemId'], Download> = {},
  action: DownloadsAction
): Record<Download['itemId'], Download> => {
  switch (action.type) {
    case APP_SETTINGS_LOADED: {
      const initDownloads = action.payload.downloads ?? {};
      Object.values(initDownloads).forEach((value) => {
        if (value.state === 'progressing' || value.state === 'paused') {
          value.state = 'cancelled';
          value.status = DownloadStatus.CANCELLED;
        }
      });
      return initDownloads ?? {};
    }

    case DOWNLOAD_CREATED: {
      const download = action.payload;
      return {
        ...state,
        [download.itemId]: download,
      };
    }

    case DOWNLOAD_UPDATED: {
      const existingDownload = state[action.payload.itemId];
      if (!existingDownload) {
        return state; // Don't update if download doesn't exist
      }

      const newState = { ...state };
      newState[action.payload.itemId] = {
        ...existingDownload,
        ...action.payload,
      };
      return newState;
    }

    case DOWNLOAD_REMOVED: {
      const newState = { ...state };
      delete newState[action.payload];
      return newState;
    }

    case DOWNLOADS_CLEARED:
      return {};

    default:
      return state;
  }
};
