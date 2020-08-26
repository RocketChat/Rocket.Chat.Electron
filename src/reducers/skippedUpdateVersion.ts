import { Reducer } from 'redux';

import {
  UPDATES_READY,
  PERSISTABLE_VALUES_MERGED,
  UPDATE_SKIPPED,
  UpdatesReadyAction,
  PersistableValuesMergedAction,
  UpdateSkippedAction,
} from '../actions';

type SkippedUpdateVersionAction = (
  UpdatesReadyAction
  | PersistableValuesMergedAction
  | UpdateSkippedAction
);

export const skippedUpdateVersion: Reducer<string | null, SkippedUpdateVersionAction> = (state = null, action) => {
  switch (action.type) {
    case UPDATES_READY: {
      const { skippedUpdateVersion } = action.payload;
      return skippedUpdateVersion;
    }

    case UPDATE_SKIPPED: {
      const skippedUpdateVersion = action.payload;
      return skippedUpdateVersion;
    }

    case PERSISTABLE_VALUES_MERGED: {
      const { skippedUpdateVersion = state } = action.payload;
      return skippedUpdateVersion;
    }

    default:
      return state;
  }
};
