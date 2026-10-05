import type { Reducer } from 'redux';

import { APP_SETTINGS_LOADED } from '../../app/actions';
import type { ActionOf } from '../../store/actions';
import {
  UI_PREVIEW_HISTORY_ENTRY_ADDED,
  UI_PREVIEW_HISTORY_ENTRY_REMOVED,
  UI_PREVIEW_HISTORY_ENTRY_UPDATED,
} from '../actions';
import type { UiPreviewHistoryEntry } from '../common';

type UiPreviewHistoryAction =
  | ActionOf<typeof UI_PREVIEW_HISTORY_ENTRY_ADDED>
  | ActionOf<typeof UI_PREVIEW_HISTORY_ENTRY_UPDATED>
  | ActionOf<typeof UI_PREVIEW_HISTORY_ENTRY_REMOVED>
  | ActionOf<typeof APP_SETTINGS_LOADED>;

// Bounds the persisted list; adding past it drops the entry added longest ago.
const maxEntries = 20;

/**
 * The web UI builds listed in Settings, newest addition first, keyed by input.
 *
 * Only what is listed survives a restart; which build a workspace runs never
 * does (see `uiPreview` on each server).
 */
export const uiPreviewHistory: Reducer<
  UiPreviewHistoryEntry[],
  UiPreviewHistoryAction
> = (state = [], action) => {
  switch (action.type) {
    case UI_PREVIEW_HISTORY_ENTRY_ADDED: {
      const entry = action.payload;
      return [
        entry,
        ...state.filter(({ input }) => input !== entry.input),
      ].slice(0, maxEntries);
    }

    // In place, and only for a listed entry, so a refresh never reorders or revives one.
    case UI_PREVIEW_HISTORY_ENTRY_UPDATED: {
      const entry = action.payload;
      return state.map((listed) =>
        listed.input === entry.input ? entry : listed
      );
    }

    case UI_PREVIEW_HISTORY_ENTRY_REMOVED:
      return state.filter(({ input }) => input !== action.payload);

    case APP_SETTINGS_LOADED: {
      const { uiPreviewHistory = state } = action.payload;
      return uiPreviewHistory;
    }

    default:
      return state;
  }
};
