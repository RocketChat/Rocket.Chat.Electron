import { Reducer } from 'redux';

import {
  UPDATES_READY,
  PERSISTABLE_VALUES_MERGED,
  UPDATE_SKIPPED,
  ActionOf,
} from '../actions';

type SkippedUpdateVersionAction = (
  ActionOf<typeof UPDATES_READY>
  | ActionOf<typeof PERSISTABLE_VALUES_MERGED>
  | ActionOf<typeof UPDATE_SKIPPED>
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
